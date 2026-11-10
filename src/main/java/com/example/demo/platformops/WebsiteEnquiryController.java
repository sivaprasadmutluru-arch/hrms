package com.example.demo.platformops;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.validation.annotation.Validated;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
@RestController @RequiredArgsConstructor @Validated
public class WebsiteEnquiryController {
 @ExceptionHandler(ResponseStatusException.class)
 public org.springframework.http.ResponseEntity<Map<String,String>> integrationError(ResponseStatusException e){return org.springframework.http.ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()==null?"Invalid request":e.getReason()));}
 @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
 public org.springframework.http.ResponseEntity<Map<String,String>> invalidFilter(){return org.springframework.http.ResponseEntity.badRequest().body(Map.of("message","Invalid filter or update"));}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final Validator validator;
 @Value("${app.website.enquiry-secret:}") private String secret;
 public record Enquiry(@NotBlank @Pattern(regexp="SHV-[A-F0-9]{8}") String reference,@NotBlank @Size(max=100) String name,@NotBlank @Email @Size(max=254) String email,@Size(max=30) String phone,@NotNull @Pattern(regexp="AccrueHR (registration|support|feedback)") String category,@NotBlank @Size(min=10,max=3000) String message,@NotNull @Positive Long createdAt,@NotNull @Positive Long consentAt) {}
 public record Update(@NotNull @Pattern(regexp="NEW|IN_PROGRESS|CONTACTED|CLOSED") String status,@NotNull @Size(max=2000) String notes) {}
 @PostMapping("/api/public/website-enquiries")
 public Map<String,Object> accept(@RequestHeader(value="X-Accrue-Timestamp",defaultValue="") String timestamp,@RequestHeader(value="X-Accrue-Signature",defaultValue="") String signature,@RequestBody String body) throws Exception {
  if(secret.length()<32)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Website integration is not configured");
  long now=Instant.now().getEpochSecond();long sent;
  try{sent=Long.parseLong(timestamp);}catch(Exception e){throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid integration signature");}
  if((sent<now-300 || sent>now+300) || body.length()>12000 || !signature.matches("[a-f0-9]{64}"))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid integration signature");
  Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
  String expected=HexFormat.of().formatHex(mac.doFinal((timestamp+"."+body).getBytes(StandardCharsets.UTF_8)));
  if(!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),signature.getBytes(StandardCharsets.UTF_8)))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid integration signature");
  Enquiry e;try{e=mapper.readValue(body,Enquiry.class);}catch(Exception error){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid enquiry");}
  if(!validator.validate(e).isEmpty() || e.createdAt()>System.currentTimeMillis()+300000 || e.consentAt()>System.currentTimeMillis()+300000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid enquiry");
  String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(body.getBytes(StandardCharsets.UTF_8)));
  jdbc.update("INSERT INTO public.website_enquiries(reference,name,email,phone,category,message,submitted_at,consent_at,payload_hash) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(reference) DO NOTHING",e.reference(),e.name(),e.email(),e.phone(),e.category(),e.message(),new java.sql.Timestamp(e.createdAt()),new java.sql.Timestamp(e.consentAt()),hash);
  if(!hash.equals(jdbc.queryForObject("SELECT payload_hash FROM public.website_enquiries WHERE reference=?",String.class,e.reference())))throw new ResponseStatusException(HttpStatus.CONFLICT,"Reference already exists with different content");
  return Map.of("reference",e.reference(),"received",true);
 }
 @GetMapping("/api/platform-operations/website-enquiries") @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
 public Map<String,Object> list(@RequestParam(defaultValue="0") @Min(0) @Max(10000) int page,@RequestParam(defaultValue="") @Pattern(regexp="|NEW|IN_PROGRESS|CONTACTED|CLOSED") String status,@RequestParam(defaultValue="") @Size(max=100) String search){
  String q="%"+search.toLowerCase(Locale.ROOT)+"%";String where=" WHERE (?='' OR status=?) AND (lower(name) LIKE ? OR lower(email) LIKE ? OR lower(message) LIKE ? OR lower(reference) LIKE ?)";
  return Map.of("items",jdbc.queryForList("SELECT reference,name,email,phone,category,message,status,notes,submitted_at,received_at,updated_at,updated_by FROM public.website_enquiries"+where+" ORDER BY received_at DESC LIMIT 25 OFFSET ?",status,status,q,q,q,q,page*25),"total",jdbc.queryForObject("SELECT count(*) FROM public.website_enquiries"+where,Long.class,status,status,q,q,q,q));
 }
 @PatchMapping("/api/platform-operations/website-enquiries/{reference}") @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
 public Map<String,Object> update(@PathVariable @Pattern(regexp="SHV-[A-F0-9]{8}") String reference,@Valid @RequestBody Update update){
  String actor=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
  if(jdbc.update("UPDATE public.website_enquiries SET status=?,notes=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE reference=?",update.status(),update.notes(),actor,reference)==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Enquiry not found");return Map.of("updated",true);
 }
}
