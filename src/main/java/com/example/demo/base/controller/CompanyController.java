package com.example.demo.base.controller;

import com.example.demo.base.dto.CompanyRequest;
import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.service.CompanyService;
import com.example.demo.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
@Tag(name = "Companies")
public class CompanyController {

    private final CompanyService companyService;
    private final CompanyRepository companyRepository;

    // ---- Prabha Tech (Platform Super Admin) endpoints ----

    @GetMapping
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "List all companies across all organizations (Prabha Tech only)")
    public ResponseEntity<List<Company>> listAll() {
        return ResponseEntity.ok(companyRepository.findAll());
    }

    @GetMapping("/head-offices")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "List all Head Offices (Prabha Tech only)")
    public ResponseEntity<List<Company>> listHeadOffices() {
        return ResponseEntity.ok(companyService.getAllHeadOffices());
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Deactivate a company (Prabha Tech only)")
    public ResponseEntity<Map<String, String>> deactivate(@PathVariable Long id) {
        companyService.deactivate(id);
        return ResponseEntity.ok(Map.of("message", "Company deactivated"));
    }
}
