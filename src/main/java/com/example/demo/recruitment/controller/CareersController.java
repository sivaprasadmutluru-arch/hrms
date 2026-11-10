package com.example.demo.recruitment.controller;
import com.example.demo.recruitment.service.CareersService;
import com.example.demo.recruitment.dto.CandidateApplicationRequest;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
@RestController @RequiredArgsConstructor
public class CareersController {
 private final CareersService service;
 private final ConcurrentHashMap<String,long[]> limits=new ConcurrentHashMap<>();
 private final Object limitLock=new Object();
 @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
 public ResponseEntity<Map<String,String>> rateLimit(org.springframework.web.server.ResponseStatusException error) {
  return ResponseEntity.status(error.getStatusCode()).header("Retry-After","60").cacheControl(CacheControl.noStore()).body(Map.of("message",Objects.requireNonNullElse(error.getReason(),"Please try again later")));
 }
 @GetMapping("/api/public/careers/{slug}/jobs") public Map<String,Object> jobs(@PathVariable String slug){return service.list(slug);}
 @GetMapping("/api/public/careers/{slug}/jobs/{id}") public Map<String,Object> job(@PathVariable String slug,@PathVariable Long id){return service.job(slug,id);}
 @PostMapping(value="/api/public/careers/{slug}/jobs/{id}/apply",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
 public Map<String,Object> apply(@PathVariable String slug,@PathVariable Long id,@Valid @ModelAttribute CandidateApplicationRequest form,HttpServletRequest request){
  // Single-instance safety net. Use an edge/shared rate limit for multi-node deployments.
  long now=System.currentTimeMillis();
  synchronized(limitLock) {
   limits.entrySet().removeIf(e->now-e.getValue()[0]>=60000);
   if(limits.size()>=10000 && !limits.containsKey(request.getRemoteAddr())) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Please try again later");
   long[] counter=limits.computeIfAbsent(request.getRemoteAddr(),key->new long[]{now,0});
   if(++counter[1]>10) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Too many applications. Please try again in a minute");
  }
  return service.apply(slug,id,form,false);
 }
 @GetMapping("/api/recruitment/careers-settings") @PreAuthorize("hasAuthority('recruitment:view')") public Map<String,Object> settings(){return service.settings();}
 @GetMapping("/api/recruitment/candidate-applications") @PreAuthorize("hasAuthority('recruitment:view')") public List<Map<String,Object>> applications(){return service.applications();}
 @PostMapping(value="/api/recruitment/candidates",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) @PreAuthorize("hasAuthority('recruitment:create')")
 public Map<String,Object> create(@RequestParam Long jobId,@Valid @ModelAttribute CandidateApplicationRequest form){return service.apply(null,jobId,form,true);}
 @GetMapping("/api/recruitment/private-resumes/{id}") @PreAuthorize("hasAuthority('recruitment:view')")
 public ResponseEntity<byte[]> resume(@PathVariable Long id){return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header("Content-Disposition","attachment; filename=resume.pdf").header("X-Content-Type-Options","nosniff").cacheControl(CacheControl.noStore()).body(service.resume(id));}
}
