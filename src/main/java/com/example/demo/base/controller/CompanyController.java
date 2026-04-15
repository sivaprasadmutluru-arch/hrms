package com.example.demo.base.controller;

import com.example.demo.base.dto.CompanyRequest;
import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.service.CompanyService;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
@Tag(name = "Companies")
public class CompanyController {

    private final CompanyService companyService;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;

    // ---- Prabha Tech (Platform Super Admin) endpoints ----

    @GetMapping
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "List all companies across all organizations (Prabha Tech only)")
    public ResponseEntity<List<Company>> listAll(
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId) {
        if (companyId != null) {
            return companyRepository.findById(companyId)
                    .filter(c -> c.getOrganization() != null)
                    .map(c -> ResponseEntity.ok(
                            companyRepository.findAllActiveByOrganizationIdPublic(c.getOrganization().getId())))
                    .orElseGet(() -> ResponseEntity.ok(companyRepository.findAllActivePublic()));
        }
        return ResponseEntity.ok(companyRepository.findAllActivePublic());
    }

    @GetMapping("/head-offices")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "List all Head Offices (Prabha Tech only)")
    public ResponseEntity<List<Company>> listHeadOffices() {
        return ResponseEntity.ok(companyRepository.findAllHeadOfficesActivePublic());
    }

    @PostMapping("/head-office")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Create a Head Office for a client organization (Prabha Tech only)")
    public ResponseEntity<Company> createHeadOffice(@Valid @RequestBody CompanyRequest request) {
        return ResponseEntity.ok(companyService.createHeadOffice(request));
    }

    // ---- Head Office Admin (Enterprise Admin) endpoints ----

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Get company details")
    public ResponseEntity<Company> get(@PathVariable Long id) {
        return ResponseEntity.ok(companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", id)));
    }

    @GetMapping("/{headOfficeId}/branches")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Operation(summary = "List all branches under a Head Office")
    public ResponseEntity<List<Company>> listBranches(@PathVariable Long headOfficeId) {
        return ResponseEntity.ok(companyService.getBranches(headOfficeId));
    }

    @GetMapping("/branches/summary")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Operation(summary = "List branches with active employee count (via query param)")
    public ResponseEntity<List<Map<String, Object>>> branchesSummaryByParam(@RequestParam Long companyId) {
        return branchesSummary(companyId);
    }

    @GetMapping("/{headOfficeId}/branches-summary")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Operation(summary = "List branches with active employee count")
    public ResponseEntity<List<Map<String, Object>>> branchesSummary(@PathVariable Long headOfficeId) {
        List<Company> branches = companyService.getBranches(headOfficeId);
        List<Map<String, Object>> result = branches.stream().map(b -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", b.getId());
            m.put("name", b.getName());
            m.put("email", b.getEmail());
            m.put("location", b.getAddress() != null ? b.getAddress() : (b.getCity() != null ? b.getCity() : null));
            m.put("status", b.getStatus());
            m.put("employeeCount", employeeRepository.countByCompanyIdAndIsActiveTrue(b.getId()));
            return m;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{headOfficeId}/branches")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Operation(summary = "Create a new branch under a Head Office (max 5 branches enforced)")
    public ResponseEntity<Company> createBranch(@PathVariable Long headOfficeId,
                                                 @Valid @RequestBody CompanyRequest request) {
        return ResponseEntity.ok(companyService.createBranch(headOfficeId, request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Update company details")
    public ResponseEntity<Company> update(@PathVariable Long id,
                                           @Valid @RequestBody CompanyRequest request) {
        return ResponseEntity.ok(companyService.update(id, request));
    }

    @PatchMapping("/{id}/currency")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Update the currency for a company/branch")
    public ResponseEntity<Company> updateCurrency(@PathVariable Long id,
                                                   @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(companyService.updateCurrency(id, body.get("currency")));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Delete a company and all its data (Prabha Tech only)")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        companyService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Company deleted"));
    }

    @PostMapping("/{id}/logo")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Upload logo for a Head Office or Branch")
    public ResponseEntity<Map<String, String>> uploadLogo(@PathVariable Long id,
                                                          @RequestParam("file") MultipartFile file) {
        Company company = companyService.uploadLogo(id, file);
        return ResponseEntity.ok(Map.of("logoPath", company.getLogoPath(), "url", "/api/files/" + company.getLogoPath()));
    }
}
