package com.example.demo.recruitment.service;
import com.example.demo.recruitment.dto.CandidateApplicationRequest;
import com.example.demo.common.context.*;
import com.example.demo.common.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.security.access.AccessDeniedException;
import java.util.*;
import java.nio.file.*;
import java.time.*;
import java.io.IOException;

@Service @RequiredArgsConstructor
public class CareersService {
 private final JdbcTemplate jdbc;
 @Value("${app.recruitment.resume-dir:./private-resumes}") private String resumeDir;
 @Value("${app.frontend-url:http://localhost:5173}") private String frontendUrl;
 private String careersUrl(Workspace w) { return frontendUrl.replaceAll("/+$", "") + "/careers/" + w.slug(); }
 private Map<String,Object> publicJob(Workspace w,Map<String,Object> row) {
  var result=new LinkedHashMap<String,Object>(row);result.put("applyUrl",careersUrl(w)+"/"+row.get("id"));return result;
 }
 private record Workspace(Long orgId,String name,String slug,String schema) {}
 private Workspace workspace(String slug) {
  var rows=jdbc.queryForList("SELECT o.id,o.name,o.slug,c.schema_name FROM public.organizations o JOIN public.companies c ON c.organization_id=o.id AND c.company_type='HEAD_OFFICE' WHERE o.slug=? AND o.is_active=true AND o.status='ACTIVE' AND c.is_active=true AND c.schema_ready=true",slug);
  if(rows.size()!=1) throw new ResourceNotFoundException("Careers page not found");
  var r=rows.getFirst();String schema=(String)r.get("schema_name");
  if(schema==null || !schema.matches("[a-zA-Z_][a-zA-Z0-9_]*")) throw new IllegalStateException("Workspace is unavailable");
  return new Workspace(((Number)r.get("id")).longValue(),(String)r.get("name"),(String)r.get("slug"),"\""+schema+"\"");
 }
 private Workspace selected() {
  Long company=CompanyContext.get();if(company==null) throw new BadRequestException("Select a company first");
  var rows=jdbc.queryForList("SELECT o.slug FROM public.organizations o JOIN public.companies c ON c.organization_id=o.id WHERE c.id=?",company);
  if(rows.isEmpty()) throw new BadRequestException("Company has no organization");
  return workspace((String)rows.getFirst().get("slug"));
 }
 private void requireCompany(Long id) {
  var scope=AccessScopeContext.get();
  if(scope==null || !scope.canAccess(id)) throw new AccessDeniedException("Company is outside your access scope");
 }
 private List<Map<String,Object>> jobs(Workspace w) {
  var today=LocalDate.now(ZoneId.of("Asia/Kolkata"));
  return jdbc.queryForList("SELECT p.id,p.name AS title,p.description,p.department,p.location,p.employment_type AS \"type\",p.end_date AS deadline,c.name AS \"companyName\" FROM "+w.schema()+".recruitment_posts p JOIN public.companies c ON c.id=p.company_id WHERE c.organization_id=? AND c.is_active=true AND p.is_active=true AND p.is_published=true AND p.status='OPEN' AND coalesce(p.closed,false)=false AND (p.start_date IS NULL OR p.start_date<=?) AND (p.end_date IS NULL OR p.end_date>=?) ORDER BY p.id DESC",w.orgId(),today,today);
 }
 @Transactional(readOnly=true) public Map<String,Object> list(String slug) {
  var w=workspace(slug);return Map.of("apiVersion",1,"organization",w.name(),"slug",w.slug(),"careersUrl",careersUrl(w),"jobs",jobs(w).stream().map(row->publicJob(w,row)).toList());
 }
 @Transactional(readOnly=true) public Map<String,Object> job(String slug,Long id) {
  var w=workspace(slug);var post=jobs(w).stream().filter(r -> ((Number)r.get("id")).longValue()==id).findFirst().orElseThrow(()->new ResourceNotFoundException("Open job",id));
  return Map.of("apiVersion",1,"organization",w.name(),"slug",w.slug(),"careersUrl",careersUrl(w),"job",publicJob(w,post));
 }
 @Transactional(readOnly=true) public Map<String,Object> settings() {var w=selected();return Map.of("slug",w.slug(),"organization",w.name(),"careersUrl",careersUrl(w),"widgetUrl",frontendUrl.replaceAll("/+$", "")+"/careers-widget.js");}
 @Transactional public Map<String,Object> apply(String slug,Long jobId,CandidateApplicationRequest r,boolean internal) {
  var w=internal?selected():workspace(slug);
  var posts=jdbc.queryForList("SELECT p.id,p.company_id,p.name,p.is_active,p.is_published,p.status,p.closed,p.start_date,p.end_date FROM "+w.schema()+".recruitment_posts p JOIN public.companies c ON c.id=p.company_id WHERE p.id=? AND c.organization_id=? AND c.is_active=true FOR UPDATE OF p",jobId,w.orgId());
  if(posts.isEmpty()) throw new ResourceNotFoundException("Job",jobId);
  var post=posts.getFirst();Long companyId=((Number)post.get("company_id")).longValue();
  if(internal) requireCompany(companyId);
  var today=LocalDate.now(ZoneId.of("Asia/Kolkata"));
  var start=(java.sql.Date)post.get("start_date");var end=(java.sql.Date)post.get("end_date");
  if(!Boolean.TRUE.equals(post.get("is_active")) || !"OPEN".equals(post.get("status")) || Boolean.TRUE.equals(post.get("closed")) || (!internal && (!Boolean.TRUE.equals(post.get("is_published")) || start!=null && start.toLocalDate().isAfter(today))) || end!=null && end.toLocalDate().isBefore(today)) throw new BadRequestException("This opening is not accepting applications");
  if(!internal && (!r.isConsent() || r.getWebsite()!=null && !r.getWebsite().isBlank())) throw new BadRequestException("Please confirm consent and submit the application form");
  String email=r.getEmail().strip().toLowerCase(Locale.ROOT);
  // Serialize matching email submissions within this tenant, including applications to different jobs.
  jdbc.queryForList("SELECT pg_advisory_xact_lock(hashtextextended(?,0))",w.schema()+":"+email);
  if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM "+w.schema()+".applicants a JOIN "+w.schema()+".candidates c ON c.id=a.candidate_id WHERE lower(trim(c.email))=? AND a.recruitment_id=?)",Boolean.class,email,jobId))) throw new BadRequestException("An application with this email already exists for this opening");
  String resume=storeResume(r);
  // Keep submitted details local to this application; never disclose/reuse another branch's profile.
  Long candidateId=jdbc.queryForObject("INSERT INTO "+w.schema()+".candidates(name,email,mobile,source,resume_path,is_active,created_at,updated_at) VALUES(?,?,?,?,?,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,r.getName().strip(),email,r.getPhone(),internal?"HR":"CAREERS",resume);
  if(resume!=null) jdbc.update("INSERT INTO "+w.schema()+".recruitment_resumes(candidate_id,file_path,file_name,is_primary,is_active,created_at,updated_at) VALUES(?,?,?,false,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",candidateId,resume,"resume.pdf");
  Long stage=jdbc.queryForList("SELECT id FROM "+w.schema()+".recruitment_stages WHERE recruitment_id=? AND is_active=true ORDER BY sequence NULLS LAST,id LIMIT 1",Long.class,jobId).stream().findFirst().orElse(null);
  if(stage==null) stage=jdbc.queryForObject("INSERT INTO "+w.schema()+".recruitment_stages(name,sequence,stage_type,recruitment_id,is_active,created_at,updated_at) VALUES('Applied',1,'APPLIED',?,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,jobId);
  Long applicationId=jdbc.queryForObject("INSERT INTO "+w.schema()+".applicants(candidate_id,recruitment_id,company_id,stage_id,status,priority,applied_date,is_active,created_at,updated_at) VALUES(?,?,?,?,'IN_PROGRESS','NORMAL',?,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id",Long.class,candidateId,jobId,companyId,stage,today);
  return internal?Map.of("message","Candidate created","candidateId",candidateId,"applicationId",applicationId):Map.of("message","Application received. The hiring team will review your application.");
 }
 private String storeResume(CandidateApplicationRequest r) {
  var file=r.getResume();if(file==null || file.isEmpty()) return null;
  if(file.getSize()>5*1024*1024 || file.getOriginalFilename()==null || !file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".pdf")) throw new BadRequestException("Upload a PDF resume up to 5 MB");
  try {
   byte[] bytes=file.getBytes();if(bytes.length<5 || !new String(bytes,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")) throw new BadRequestException("The resume must be a valid PDF file");
   Path dir=Path.of(resumeDir).toAbsolutePath();Files.createDirectories(dir,java.nio.file.attribute.PosixFilePermissions.asFileAttribute(java.nio.file.attribute.PosixFilePermissions.fromString("rwx------")));String name=UUID.randomUUID()+".pdf";Path path=dir.resolve(name);Files.createFile(path,java.nio.file.attribute.PosixFilePermissions.asFileAttribute(java.nio.file.attribute.PosixFilePermissions.fromString("rw-------")));
   TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED) try{Files.deleteIfExists(path);}catch(IOException ignored){}}});
   Files.write(path,bytes,StandardOpenOption.TRUNCATE_EXISTING);return name;
  } catch(IOException e){throw new IllegalStateException("Unable to store the resume",e);}
 }
 @Transactional(readOnly=true) public List<Map<String,Object>> applications() {
  var w=selected();var rows=jdbc.queryForList("SELECT a.id,a.company_id AS \"companyId\",a.candidate_id AS \"candidateId\",c.name,c.email,c.mobile AS phone,a.status,a.applied_date AS \"appliedDate\",p.name AS \"jobTitle\",s.name AS \"stageName\",s.stage_type AS \"stageType\",(SELECT r.id FROM "+w.schema()+".recruitment_resumes r WHERE r.candidate_id=c.id ORDER BY r.id DESC LIMIT 1) AS \"resumeId\" FROM "+w.schema()+".applicants a JOIN "+w.schema()+".candidates c ON c.id=a.candidate_id JOIN "+w.schema()+".recruitment_posts p ON p.id=a.recruitment_id LEFT JOIN "+w.schema()+".recruitment_stages s ON s.id=a.stage_id WHERE a.is_active=true ORDER BY a.id DESC");
  return rows.stream().filter(row -> AccessScopeContext.get()!=null && AccessScopeContext.get().canAccess(((Number)row.get("companyId")).longValue())).toList();
 }
 @Transactional(readOnly=true) public byte[] resume(Long id) {
  var w=selected();var rows=jdbc.queryForList("SELECT r.file_path,a.company_id FROM "+w.schema()+".recruitment_resumes r JOIN "+w.schema()+".applicants a ON a.candidate_id=r.candidate_id WHERE r.id=?",id);
  var row=rows.stream().filter(r -> AccessScopeContext.get()!=null && AccessScopeContext.get().canAccess(((Number)r.get("company_id")).longValue())).findFirst().orElseThrow(()->new ResourceNotFoundException("Resume",id));
  String name=(String)row.get("file_path");if(name==null || !name.matches("[a-f0-9-]{36}\\.pdf")) throw new ResourceNotFoundException("Resume",id);
  try{return Files.readAllBytes(Path.of(resumeDir).toAbsolutePath().resolve(name));}catch(IOException e){throw new ResourceNotFoundException("Resume",id);}
 }
}
