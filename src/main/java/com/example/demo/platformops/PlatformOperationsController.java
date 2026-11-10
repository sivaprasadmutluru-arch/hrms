package com.example.demo.platformops;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.Map;
@RestController @RequestMapping("/api/platform-operations") @RequiredArgsConstructor @Validated
public class PlatformOperationsController {
 private final PlatformOperationsService service;
 private final PlatformTeamAccess platformTeam;
 @GetMapping("/billing-context") @PreAuthorize("@platformTeam.billing()") public Map<String,Object> billingContext(){return Map.of("platform",false,"organizations",java.util.List.of());}
 @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
 public org.springframework.http.ResponseEntity<Map<String,String>> validation(jakarta.validation.ConstraintViolationException error){return org.springframework.http.ResponseEntity.badRequest().body(Map.of("message","Invalid filter or page number"));}
 public record Create(@NotNull Long organizationId,@NotBlank @Size(max=200) String subject,@Pattern(regexp="BILLING|TECHNICAL|ACCOUNT|FEATURE|OTHER") @NotNull String category,@Pattern(regexp="LOW|NORMAL|HIGH|URGENT") @NotNull String priority,@NotBlank @Size(max=6000) String body) {}
 public record Reply(@NotBlank @Size(max=6000) String body) {}
 public record Update(@NotNull @Pattern(regexp="OPEN|IN_PROGRESS|WAITING_CUSTOMER|WAITING_SUPPORT|RESOLVED|CLOSED") String status,@NotNull @Pattern(regexp="LOW|NORMAL|HIGH|URGENT") String priority,boolean assignToMe,@NotBlank @Size(max=2000) String reason) {}
 @GetMapping("/context") public Map<String,Object> context(){return service.context();}
 @GetMapping("/billing") @PreAuthorize("@platformTeam.billing()") public Map<String,Object> billing(@RequestParam(defaultValue="0") @Min(0) @Max(10000) int page,@RequestParam(defaultValue="") @Size(max=150) String search){return service.billingList(page,search);}
 @GetMapping("/billing/{id}") @PreAuthorize("@platformTeam.billing()") public Map<String,Object> billingDetail(@PathVariable Long id,@RequestParam(defaultValue="0") @Min(0) @Max(10000) int page){return service.billingDetail(id,page);}
 @GetMapping("/support") public Map<String,Object> list(@RequestParam(required=false) Long organizationId,@RequestParam(defaultValue="0") @Min(0) @Max(10000) int page,@RequestParam(defaultValue="") @Pattern(regexp="|OPEN|IN_PROGRESS|WAITING_CUSTOMER|WAITING_SUPPORT|RESOLVED|CLOSED") String status){return service.supportList(organizationId,page,status);}
 @PostMapping("/support") public Map<String,Object> create(@Valid @RequestBody Create r){return service.create(r.organizationId(),r.subject(),r.category(),r.priority(),r.body());}
 @GetMapping("/support/{id}") public Map<String,Object> detail(@PathVariable Long id,@RequestParam(defaultValue="0") @Min(0) @Max(10000) int page){return service.detail(id,page);}
 @PostMapping("/support/{id}/replies") public Map<String,Object> reply(@PathVariable Long id,@Valid @RequestBody Reply r){return service.reply(id,r.body());}
 @PatchMapping("/support/{id}") @PreAuthorize("@platformTeam.support()") public Map<String,Object> update(@PathVariable Long id,@Valid @RequestBody Update r){return service.update(id,r.status(),r.priority(),r.assignToMe(),r.reason());}
}
