package com.example.demo.base.controller;

import com.example.demo.base.dto.CompanyRequest;
import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.service.CompanyService;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.tenant.TenantProvisioningService;
import com.example.demo.common.tenant.TenantProvisioningStatusResponse;
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
    private final TenantProvisioningService tenantProvisioningService;

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

    @GetMapping("/{companyId}/provisioning-status")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Get durable tenant workspace provisioning status")
    public ResponseEntity<TenantProvisioningStatusResponse> provisioningStatus(@PathVariable Long companyId) {
        return ResponseEntity.ok(tenantProvisioningService.getStatus(companyId));
    }

    @PostMapping("/{companyId}/provisioning-retry")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Retry a failed tenant workspace provisioning job now")
    public ResponseEntity<TenantProvisioningStatusResponse> retryProvisioning(@PathVariable Long companyId) {
        return ResponseEntity.ok(tenantProvisioningService.retryNow(companyId));
    }

    // ---- Any authenticated user ----

    @GetMapping("/accessible")
    @Operation(summary = "List companies available to the current user's access scope")
    public ResponseEntity<List<Company>> getAccessibleCompanies() {
        var scope = AccessScopeContext.get();
        if (scope == null) {
            return ResponseEntity.ok(List.of());
        }
        if (scope.hasUnrestrictedAccess()) {
            return ResponseEntity.ok(companyRepository.findAllActivePublic());
        }
        return ResponseEntity.ok(companyRepository.findAllById(scope.getAccessibleCompanyIds()).stream()
                .filter(company -> company.getStatus() == Company.CompanyStatus.ACTIVE)
                .toList());
    }

    @GetMapping("/mine")
    @Operation(summary = "Get the current user's own company (available to all authenticated users)")
    public ResponseEntity<Company> getMine() {
        var scope = AccessScopeContext.get();
        Long companyId = scope != null ? scope.getCompanyId() : null;
        if (companyId == null) {
            throw new ResourceNotFoundException("Company", -1L);
        }
        return ResponseEntity.ok(companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId)));
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
    @Operation(summary = "Archive a company and preserve all data for restore (Prabha Tech only)")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id,
                                                       @RequestBody(required = false) Map<String, String> body) {
        companyService.archive(id, body == null ? null : body.get("reason"));
        return ResponseEntity.ok(Map.of("message", "Company archived. All data has been retained and can be restored."));
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Restore an archived company and its branches")
    public ResponseEntity<Map<String, String>> restore(@PathVariable Long id) {
        companyService.restore(id);
        return ResponseEntity.ok(Map.of("message", "Company restored"));
    }

    @DeleteMapping("/{id}/permanent")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Permanently purge a company and its live HRMS data. Irreversible.")
    public ResponseEntity<Map<String, String>> purgePermanently(@PathVariable Long id,
                                                                  @RequestParam String confirmName) {
        Company company = companyService.getById(id);
        if (!company.getName().equals(confirmName)) {
            throw new com.example.demo.common.exception.BadRequestException(
                    "Type the exact company name to permanently purge it");
        }
        companyService.purgePermanently(id);
        return ResponseEntity.ok(Map.of("message", "Company permanently purged from live HRMS data"));
    }

    @PostMapping("/{id}/logo")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Upload logo for a Head Office or Branch")
    public ResponseEntity<Map<String, String>> uploadLogo(@PathVariable Long id,
                                                          @RequestParam("file") MultipartFile file) {
        Company company = companyService.uploadLogo(id, file);
        return ResponseEntity.ok(Map.of("logoPath", company.getLogoPath(), "url", "/api/files/" + company.getLogoPath()));
    }

    @PostMapping("/{id}/stamp")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Upload company stamp/seal, stamped onto generated payslips")
    public ResponseEntity<Map<String, String>> uploadStamp(@PathVariable Long id,
                                                            @RequestParam("file") MultipartFile file) {
        Company company = companyService.uploadStamp(id, file);
        return ResponseEntity.ok(Map.of("stampPath", company.getStampPath(), "url", "/api/files/" + company.getStampPath()));
    }

    @DeleteMapping("/{id}/stamp")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Remove company stamp/seal")
    public ResponseEntity<Map<String, String>> deleteStamp(@PathVariable Long id) {
        companyService.deleteStamp(id);
        return ResponseEntity.ok(Map.of("message", "Stamp removed"));
    }

    @PostMapping("/{id}/signature")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Upload authorized signatory's signature, stamped onto generated payslips")
    public ResponseEntity<Map<String, String>> uploadSignature(@PathVariable Long id,
                                                                @RequestParam("file") MultipartFile file) {
        Company company = companyService.uploadSignature(id, file);
        return ResponseEntity.ok(Map.of("signaturePath", company.getSignaturePath(), "url", "/api/files/" + company.getSignaturePath()));
    }

    @DeleteMapping("/{id}/signature")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Remove authorized signatory's signature")
    public ResponseEntity<Map<String, String>> deleteSignature(@PathVariable Long id) {
        companyService.deleteSignature(id);
        return ResponseEntity.ok(Map.of("message", "Signature removed"));
    }
}
