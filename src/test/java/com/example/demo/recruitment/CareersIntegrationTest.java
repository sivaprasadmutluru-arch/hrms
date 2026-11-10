package com.example.demo.recruitment;
import com.example.demo.base.entity.*;
import com.example.demo.recruitment.entity.*;
import com.example.demo.recruitment.dto.CandidateApplicationRequest;
import com.example.demo.recruitment.service.CareersService;
import com.example.demo.common.context.*;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.auth.entity.UserRole;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @Transactional
class CareersIntegrationTest {
 @Autowired com.example.demo.recruitment.service.RecruitmentService recruitment; @Autowired EntityManager em; @Autowired CareersService service; @Autowired JdbcTemplate jdbc; @Autowired MockMvc mvc;
 Organization org; Company company; RecruitmentPost post;
 @BeforeEach void setup(){TenantContext.clear();CompanyContext.clear();AccessScopeContext.clear();org=new Organization();org.setName("Careers fixture");org.setSlug("careers-"+UUID.randomUUID());em.persist(org);company=new Company();company.setName("Careers company");company.setOrganization(org);company.setSchemaName("public");company.setSchemaReady(true);em.persist(company);post=post("Software Engineer",true);em.flush();}
 RecruitmentPost post(String name,boolean published){var p=new RecruitmentPost();p.setName(name);p.setCompany(company);p.setIsPublished(published);em.persist(p);em.flush();return p;}
 CandidateApplicationRequest form(String email){var r=new CandidateApplicationRequest();r.setName("Test Candidate");r.setEmail(email);r.setConsent(true);return r;}
 long applications(){return jdbc.queryForObject("select count(*) from public.applicants where recruitment_id=?",Long.class,post.getId());}
 String url(){return "/api/public/careers/"+org.getSlug()+"/jobs";}
 @AfterEach void clear(){TenantContext.clear();CompanyContext.clear();AccessScopeContext.clear();}
 @Test void anonymousListingOnlyExposesPublishedOpenJobs() throws Exception {
  post("Draft",false);var expired=post("Expired",true);expired.setEndDate(LocalDate.now().minusDays(1));var future=post("Future",true);future.setStartDate(LocalDate.now().plusDays(2));em.flush();
  mvc.perform(get(url()).header("X-Company-Id","999999")).andExpect(status().isOk()).andExpect(jsonPath("$.jobs.length()").value(1)).andExpect(jsonPath("$.jobs[0].title").value("Software Engineer"));
  mvc.perform(get("/api/recruitment/candidate-applications")).andExpect(status().isUnauthorized());
 }
 @Test void publicApplicationCreatesCandidateAndInitialStage() throws Exception {
  mvc.perform(multipart(url()+"/"+post.getId()+"/apply").param("name","Demo Candidate").param("email","demo@example.invalid").param("consent","true")).andExpect(status().isOk()).andExpect(jsonPath("$.message").exists()).andExpect(jsonPath("$.candidateId").doesNotExist());
  assertThat(applications()).isEqualTo(1);assertThat(jdbc.queryForObject("select s.name from public.applicants a join public.recruitment_stages s on s.id=a.stage_id where a.recruitment_id=?",String.class,post.getId())).isEqualTo("Applied");
 }
 @Test void duplicateNormalizedEmailCannotCreateAnotherApplication(){service.apply(org.getSlug(),post.getId(),form("DEMO@example.invalid"),false);assertThatThrownBy(()->service.apply(org.getSlug(),post.getId(),form("demo@example.invalid"),false)).hasMessageContaining("already exists");assertThat(applications()).isEqualTo(1);}
 @Test void invalidEmailAndMissingConsentAreRejected() throws Exception {
  mvc.perform(multipart(url()+"/"+post.getId()+"/apply").param("name","Demo").param("email","bad-email").param("consent","true")).andExpect(status().isBadRequest());
  var f=form("consent@example.invalid");f.setConsent(false);assertThatThrownBy(()->service.apply(org.getSlug(),post.getId(),f,false)).hasMessageContaining("consent");assertThat(applications()).isZero();
 }
 @Test void draftClosedExpiredAndUnknownTenantCannotAcceptApplications(){
  var draft=post("Draft",false);assertThatThrownBy(()->service.apply(org.getSlug(),draft.getId(),form("draft@example.invalid"),false)).hasMessageContaining("not accepting");
  jdbc.update("update public.recruitment_posts set status='CLOSED' where id=?",post.getId());assertThatThrownBy(()->service.apply(org.getSlug(),post.getId(),form("closed@example.invalid"),false)).hasMessageContaining("not accepting");
  jdbc.update("update public.recruitment_posts set status='OPEN',end_date=? where id=?",LocalDate.now().minusDays(1),post.getId());assertThatThrownBy(()->service.apply(org.getSlug(),post.getId(),form("expired@example.invalid"),false)).hasMessageContaining("not accepting");
  assertThatThrownBy(()->service.apply("missing-org",post.getId(),form("other@example.invalid"),false)).hasMessageContaining("not found");assertThat(applications()).isZero();
 }
 @Test void disguisedAndOversizeResumeCannotCreateApplication(){
  var f=form("pdf@example.invalid");f.setResume(new MockMultipartFile("resume","resume.pdf","application/pdf","not a PDF".getBytes()));assertThatThrownBy(()->service.apply(org.getSlug(),post.getId(),f,false)).hasMessageContaining("valid PDF");
  f.setResume(new MockMultipartFile("resume","resume.pdf","application/pdf",new byte[5*1024*1024+1]));assertThatThrownBy(()->service.apply(org.getSlug(),post.getId(),f,false)).hasMessageContaining("5 MB");assertThat(applications()).isZero();
 }
 @Test void manualCandidateAndApplicationsAreCompanyScoped(){
  CompanyContext.set(company.getId());AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,company.getId(),UserRole.AccessScope.BRANCH,List.of(company.getId())));
  assertThat(service.apply(null,post.getId(),form("manual@example.invalid"),true)).containsKeys("candidateId","applicationId");assertThat(service.applications()).hasSize(1);
  AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,999L,UserRole.AccessScope.BRANCH,List.of(999L)));assertThat(service.applications()).isEmpty();assertThatThrownBy(()->service.apply(null,post.getId(),form("denied@example.invalid"),true)).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
 }
 @Test void applicationsOnDifferentJobsKeepIndependentProfiles(){var second=post("QA",true);service.apply(org.getSlug(),post.getId(),form("same@example.invalid"),false);service.apply(org.getSlug(),second.getId(),form("same@example.invalid"),false);assertThat(jdbc.queryForObject("select count(distinct candidate_id) from public.applicants where recruitment_id in (?,?)",Long.class,post.getId(),second.getId())).isEqualTo(2);}
 @Test void validResumeIsAvailableOnlyThroughScopedHrDownload() throws Exception {
  byte[] pdf="%PDF-1.4\nSynthetic resume fixture\n%%EOF".getBytes();var f=form("resume@example.invalid");f.setResume(new MockMultipartFile("resume","resume.pdf","application/pdf",pdf));
  service.apply(org.getSlug(),post.getId(),f,false);
  Long resume=jdbc.queryForObject("select r.id from public.recruitment_resumes r join public.applicants a on a.candidate_id=r.candidate_id where a.recruitment_id=?",Long.class,post.getId());
  mvc.perform(get("/api/recruitment/private-resumes/"+resume)).andExpect(status().isUnauthorized());
  CompanyContext.set(company.getId());AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,company.getId(),UserRole.AccessScope.BRANCH,List.of(company.getId())));
  assertThat(service.resume(resume)).isEqualTo(pdf);
  AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,999L,UserRole.AccessScope.BRANCH,List.of(999L)));assertThatThrownBy(()->service.resume(resume)).hasMessageContaining("Resume");
 }
 @Test void recruitmentPostsAndMutationsCannotUseAnotherCompanyScope(){
  CompanyContext.set(company.getId());AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,company.getId(),UserRole.AccessScope.BRANCH,List.of(company.getId())));
  var request=new RecruitmentPost();request.setName("New scoped opening");assertThat(recruitment.createPost(request).getCompany().getId()).isEqualTo(company.getId());
  assertThat(recruitment.getPost(post.getId()).getId()).isEqualTo(post.getId());
  AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,999L,UserRole.AccessScope.BRANCH,List.of(999L)));
  assertThatThrownBy(()->recruitment.getPost(post.getId())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
  assertThatThrownBy(()->recruitment.closePost(post.getId())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
 }
 @Test void suspendedOrganizationHidesCareers(){jdbc.update("update public.organizations set status='SUSPENDED' where id=?",org.getId());assertThatThrownBy(()->service.list(org.getSlug())).hasMessageContaining("not found");}
 @Test void portableFeedSupportsExternalWebsitesWithoutCredentials() throws Exception {
  mvc.perform(get(url()).header("Origin","https://careers.customer.example"))
   .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","*"))
   .andExpect(header().doesNotExist("Access-Control-Allow-Credentials"))
   .andExpect(jsonPath("$.apiVersion").value(1))
   .andExpect(jsonPath("$.careersUrl").value("http://localhost:5173/careers/"+org.getSlug()))
   .andExpect(jsonPath("$.jobs[0].applyUrl").value("http://localhost:5173/careers/"+org.getSlug()+"/"+post.getId()))
   .andExpect(jsonPath("$.jobs[0].email").doesNotExist());
 }
 @Test void crossOriginApplicationPostsAreNotOpenedWithPublicReadCors() throws Exception {
  mvc.perform(options(url()+"/"+post.getId()+"/apply").header("Origin","https://untrusted.example").header("Access-Control-Request-Method","POST"))
   .andExpect(status().isForbidden());
  mvc.perform(options(url()).header("Origin","https://customer.example").header("Access-Control-Request-Method","GET"))
   .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","*"));
 }
 @Test void anotherOrganizationsJobCannotBeReadOrAppliedTo() throws Exception {
  Organization other=new Organization();other.setName("Other fixture");other.setSlug("other-"+UUID.randomUUID());em.persist(other);
  Company branch=new Company();branch.setName("Other company");branch.setOrganization(other);branch.setSchemaName("other_fixture");branch.setSchemaReady(true);em.persist(branch);
  var foreign=post("Other organization job",true);foreign.setCompany(branch);em.flush();
  mvc.perform(get(url()+"/"+foreign.getId())).andExpect(status().isNotFound());
  assertThatThrownBy(()->service.apply(org.getSlug(),foreign.getId(),form("cross@example.invalid"),false)).hasMessageContaining("not found");
 }
 @Test void applicationThrottlingReturns429WithRetryHint() throws Exception {
  String path=url()+"/"+post.getId()+"/apply";
  for(int i=0;i<10;i++) mvc.perform(multipart(path).param("name","Synthetic").param("email","limit@example.invalid").param("consent","false").with(r->{r.setRemoteAddr("192.0.2.55");return r;})).andExpect(status().isBadRequest());
  mvc.perform(multipart(path).param("name","Synthetic").param("email","limit@example.invalid").param("consent","true").with(r->{r.setRemoteAddr("192.0.2.55");return r;}))
   .andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After","60"));
  assertThat(applications()).isZero();
 }
}
