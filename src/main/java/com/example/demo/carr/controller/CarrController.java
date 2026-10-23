package com.example.demo.carr.controller;

import com.example.demo.carr.dto.CarrDtos.*;
import com.example.demo.carr.service.CarrService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/carr") @RequiredArgsConstructor
public class CarrController {
    private final CarrService service;
    private final com.example.demo.carr.service.CarrJobTitleCatalog jobTitleCatalog;
    @GetMapping("/job-titles") @PreAuthorize("isAuthenticated()")
    public List<com.example.demo.carr.service.CarrJobTitleCatalog.Entry> jobTitles(){
        Long companyId=com.example.demo.common.context.CompanyContext.get();
        if(companyId==null) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"Select a company before viewing job titles");
        return jobTitleCatalog.list(companyId);
    }
    // The application-wide catch-all otherwise converts intentional validation errors into HTTP 500.
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<Map<String,Object>> handleValidation(org.springframework.web.server.ResponseStatusException ex){
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("status",ex.getStatusCode().value(),"message",ex.getReason()==null?"Unable to complete this request":ex.getReason()));
    }
    @PostMapping("/kpis/suggestions") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')") public List<KpiRequest> suggestions(@Valid @RequestBody KpiSuggestionRequest r){return service.suggestKpis(r);}
    @PutMapping("/records/{id}/kpi-configuration") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')") public RecordResponse configureKpis(@PathVariable Long id,@Valid @RequestBody KpiConfigurationRequest r,Authentication a){return service.configureKpis(id,r,a);}
    @PostMapping("/records/{id}/kpis/refresh") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER','MANAGER')") public RecordResponse refreshKpis(@PathVariable Long id,Authentication a){return service.refreshKpiActuals(id,a);}
    @GetMapping("/dashboard") @PreAuthorize("isAuthenticated()") public DashboardResponse dashboard(){return service.dashboard();}
    @GetMapping("/templates") @PreAuthorize("isAuthenticated()") public List<TemplateResponse> templates(){return service.templates();}
    @PostMapping("/templates") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')") public ResponseEntity<TemplateResponse> createTemplate(@Valid @RequestBody TemplateRequest r,Authentication a){return ResponseEntity.status(HttpStatus.CREATED).body(service.saveTemplate(null,r,a));}
    @PutMapping("/templates/{id}") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')") public TemplateResponse updateTemplate(@PathVariable Long id,@Valid @RequestBody TemplateRequest r,Authentication a){return service.saveTemplate(id,r,a);}
    @PostMapping(value="/job-description/extract",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')") public Map<String,String> extractJobDescription(@RequestParam("file") MultipartFile file){return Map.of("fileName",file.getOriginalFilename()==null?"job-description":file.getOriginalFilename(),"text",service.extractJobDescription(file));}
    @GetMapping("/records") @PreAuthorize("isAuthenticated()") public List<RecordResponse> records(Authentication a){return service.records(a);}
    @GetMapping("/records/{id}") @PreAuthorize("isAuthenticated()") public RecordResponse record(@PathVariable Long id,Authentication a){return service.record(id,a);}
    @PostMapping("/records") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')") public ResponseEntity<RecordResponse> create(@Valid @RequestBody RecordRequest r,Authentication a){return ResponseEntity.status(HttpStatus.CREATED).body(service.create(r,a));}
    @PutMapping("/records/{id}") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')") public RecordResponse update(@PathVariable Long id,@Valid @RequestBody RecordRequest r,Authentication a){return service.update(id,r,a);}
    @PostMapping("/records/{id}/kpis") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')") public ResponseEntity<RecordResponse> createKpi(@PathVariable Long id,@Valid @RequestBody KpiRequest r,Authentication a){return ResponseEntity.status(HttpStatus.CREATED).body(service.saveKpi(id,null,r,a));}
    @PutMapping("/records/{id}/kpis/{kpiId}") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')") public RecordResponse updateKpi(@PathVariable Long id,@PathVariable Long kpiId,@Valid @RequestBody KpiRequest r,Authentication a){return service.saveKpi(id,kpiId,r,a);}
    @DeleteMapping("/records/{id}/kpis/{kpiId}") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')") public ResponseEntity<Void> deleteKpi(@PathVariable Long id,@PathVariable Long kpiId,Authentication a){service.deleteKpi(id,kpiId,a);return ResponseEntity.noContent().build();}
    @PostMapping("/records/{id}/transition") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')") public RecordResponse transition(@PathVariable Long id,@Valid @RequestBody TransitionRequest r,Authentication a){return service.transition(id,r,a);}
    @PostMapping("/records/{id}/approve") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER','MANAGER')") public RecordResponse approve(@PathVariable Long id,Authentication a){return service.approve(id,a);}
    @PostMapping("/records/{id}/request-changes") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER','MANAGER')") public RecordResponse requestChanges(@PathVariable Long id,@Valid @RequestBody ChangeRequest r,Authentication a){return service.requestChanges(id,r,a);}
    @PostMapping("/records/{id}/acknowledge") @PreAuthorize("isAuthenticated()") public RecordResponse acknowledge(@PathVariable Long id,Authentication a){return service.acknowledge(id,a);}
    @PostMapping("/records/{id}/complete-review") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER','MANAGER')") public RecordResponse completeReview(@PathVariable Long id,@Valid @RequestBody ReviewRequest r,Authentication a){return service.completeReview(id,r,a);}
    @PatchMapping("/records/{id}/kpis/{kpiId}/actual") @PreAuthorize("isAuthenticated()") public RecordResponse actual(@PathVariable Long id,@PathVariable Long kpiId,@Valid @RequestBody ActualValueRequest r,Authentication a){return service.updateActual(id,kpiId,r,a);}
    @GetMapping("/records/{id}/audit") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')") public List<AuditResponse> audit(@PathVariable Long id){return service.audit(id);}
}
