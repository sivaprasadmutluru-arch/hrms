package com.example.demo.report.controller;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
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
@Transactional(readOnly = true)
@Tag(name = "Platform Scope Selection (Prabha Tech Admin)")
public class PlatformCompanyScopeController {

    private final CompanyRepository companyRepository;
    private final UserRoleRepository userRoleRepository;

    @GetMapping("/companies")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','SUPER_ADMIN','ACCOUNT_MANAGER')")
    @Operation(summary = "List all companies available for scope selection (flat list with type)")
    public ResponseEntity<List<Map<String, Object>>> listSelectableCompanies(Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        boolean platformAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_PLATFORM_SUPER_ADMIN".equals(a.getAuthority()));

        List<Company> selectable;
        if (platformAdmin) {
            selectable = companyRepository.findAllActivePublic();
        } else {
            Map<Long, Company> distinct = new LinkedHashMap<>();
            userRoleRepository.findEffectiveByUserId(
                            principal.getId(), LocalDate.now(), UserRole.AssignmentStatus.ACTIVE).stream()
                    .filter(this::isMultiCompanyRole)
                    .map(UserRole::getCompany)
                    .filter(c -> c != null && c.getStatus() == Company.CompanyStatus.ACTIVE)
                    .forEach(c -> {
                        distinct.put(c.getId(), c);
                        if (c.isHeadOffice()) {
                            companyRepository.findByParentCompanyIdAndIsActiveTruePublic(c.getId()).stream()
                                    .filter(branch -> branch.getStatus() == Company.CompanyStatus.ACTIVE)
                                    .forEach(branch -> distinct.put(branch.getId(), branch));
                        }
                    });
            selectable = List.copyOf(distinct.values());
        }

        List<Map<String, Object>> result = selectable.stream().map(c -> {
            Map<String, Object> entry = new java.util.HashMap<>();
            entry.put("id", c.getId());
            entry.put("name", c.getName());
            entry.put("type", c.getCompanyType() != null ? c.getCompanyType().name() : "UNKNOWN");
            entry.put("status", c.getStatus() != null ? c.getStatus().name() : "UNKNOWN");
            entry.put("parentCompanyId", c.getParentCompany() != null ? c.getParentCompany().getId() : null);
            entry.put("currency", c.getCurrency() != null ? c.getCurrency() : "USD");
            entry.put("logoUrl", c.getLogoPath() != null ? "/api/files/" + c.getLogoPath() : null);
            return entry;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/validate/{companyId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','SUPER_ADMIN','ACCOUNT_MANAGER')")
    @Operation(summary = "Validate a company ID is a valid scope target")
    public ResponseEntity<Map<String, Object>> validateScope(@PathVariable Long companyId,
                                                              Authentication authentication) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        if (company.getStatus() != Company.CompanyStatus.ACTIVE) {
            return ResponseEntity.status(403).body(Map.of("valid", false, "message", "Company is not active"));
        }
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        boolean platformAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_PLATFORM_SUPER_ADMIN".equals(a.getAuthority()));
        if (!platformAdmin && !hasAssignedAccess(principal.getId(), company)) {
            return ResponseEntity.status(403).body(Map.of("valid", false, "message", "No active assignment for this company"));
        }
        return ResponseEntity.ok(Map.of(
                "valid", true,
                "companyId", company.getId(),
                "companyName", company.getName(),
                "type", company.getCompanyType() != null ? company.getCompanyType().name() : "UNKNOWN"
        ));
    }

    @GetMapping("/current")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','SUPER_ADMIN','ACCOUNT_MANAGER')")
    @Operation(summary = "Returns scope selection instructions — frontend passes X-Company-Id header to scope requests")
    public ResponseEntity<Map<String, Object>> scopeInstructions() {
        return ResponseEntity.ok(Map.of(
                "instructions", "Set the X-Company-Id request header to a company ID, or 'all' to view across all companies.",
                "header", "X-Company-Id",
                "allowedValues", "any valid company ID (Long) or 'all'"
        ));
    }

    private boolean hasAssignedAccess(Long userId, Company target) {
        return userRoleRepository.findEffectiveByUserId(
                        userId, LocalDate.now(), UserRole.AssignmentStatus.ACTIVE).stream()
                .filter(this::isMultiCompanyRole)
                .anyMatch(assignment -> {
                    Company assigned = assignment.getCompany();
                    if (assigned == null || assigned.getStatus() != Company.CompanyStatus.ACTIVE) return false;
                    if (assigned.getId().equals(target.getId())) return true;
                    return assigned.isHeadOffice() && target.isBranch()
                            && assigned.getId().equals(target.getParentCompanyId());
                });
    }

    private boolean isMultiCompanyRole(UserRole assignment) {
        Role.RoleName role = assignment.getRole().getName();
        return role == Role.RoleName.SUPER_ADMIN
                || role == Role.RoleName.ACCOUNT_MANAGER
                || role == Role.RoleName.COMPANY_ADMIN
                || role == Role.RoleName.ENTERPRISE_ADMIN;
    }
}
