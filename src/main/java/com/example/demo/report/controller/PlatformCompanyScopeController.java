package com.example.demo.report.controller;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Allows PLATFORM_SUPER_ADMIN to select a specific company context for viewing data.
 *
 * The frontend should send the selected companyId (or "all") as a header/param
 * on subsequent requests. The access scope interceptor honours `X-Company-Id` header.
 *
 * This controller provides helper endpoints:
 * - List all selectable companies/scopes
 * - Validate that a company ID is accessible
 */
@RestController
@RequestMapping("/api/platform/scope")
@RequiredArgsConstructor
@Tag(name = "Platform Scope Selection (Prabha Tech Admin)")
public class PlatformCompanyScopeController {

    private final CompanyRepository companyRepository;

    @GetMapping("/companies")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "List all companies available for scope selection (flat list with type)")
    public ResponseEntity<List<Map<String, Object>>> listSelectableCompanies() {
        List<Company> all = companyRepository.findAll();
        List<Map<String, Object>> result = all.stream().map(c -> {
            Map<String, Object> entry = new java.util.HashMap<>();
            entry.put("id", c.getId());
            entry.put("name", c.getName());
            entry.put("type", c.getCompanyType() != null ? c.getCompanyType().name() : "UNKNOWN");
            entry.put("status", c.getStatus() != null ? c.getStatus().name() : "UNKNOWN");
            entry.put("parentCompanyId", c.getParentCompany() != null ? c.getParentCompany().getId() : null);
            return entry;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/validate/{companyId}")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Validate a company ID is a valid scope target")
    public ResponseEntity<Map<String, Object>> validateScope(@PathVariable Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        return ResponseEntity.ok(Map.of(
                "valid", true,
                "companyId", company.getId(),
                "companyName", company.getName(),
                "type", company.getCompanyType() != null ? company.getCompanyType().name() : "UNKNOWN"
        ));
    }

    @GetMapping("/current")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Returns scope selection instructions — frontend passes X-Company-Id header to scope requests")
    public ResponseEntity<Map<String, Object>> scopeInstructions() {
        return ResponseEntity.ok(Map.of(
                "instructions", "Set the X-Company-Id request header to a company ID, or 'all' to view across all companies.",
                "header", "X-Company-Id",
                "allowedValues", "any valid company ID (Long) or 'all'"
        ));
    }
}
