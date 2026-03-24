package com.example.demo.report.controller;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.OrganizationRepository;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * System-level monitoring for Prabha Tech (PLATFORM_SUPER_ADMIN only).
 *
 * Provides a bird's-eye view across all tenants on the platform.
 * All queries run against the public schema and are not tenant-scoped.
 */
@RestController
@RequestMapping("/api/platform")
@RequiredArgsConstructor
@Tag(name = "Platform Monitor (Prabha Tech Admin)")
public class PlatformMonitorController {

    private final OrganizationRepository organizationRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Platform-wide stats: total orgs, companies, employees, active vs suspended")
    public ResponseEntity<Map<String, Object>> stats() {
        List<Organization> orgs = organizationRepository.findAll();
        List<Company> companies = companyRepository.findAll();

        long totalOrgs = orgs.size();
        long activeOrgs = orgs.stream()
                .filter(o -> Organization.OrgStatus.ACTIVE.equals(o.getStatus()))
                .count();
        long suspendedOrgs = orgs.stream()
                .filter(o -> Organization.OrgStatus.SUSPENDED.equals(o.getStatus()))
                .count();

        long totalCompanies = companies.size();
        long headOffices = companies.stream()
                .filter(c -> Company.CompanyType.HEAD_OFFICE.equals(c.getCompanyType()))
                .count();
        long branches = companies.stream()
                .filter(c -> Company.CompanyType.BRANCH.equals(c.getCompanyType()))
                .count();
        long activeCompanies = companies.stream()
                .filter(c -> Company.CompanyStatus.ACTIVE.equals(c.getStatus()))
                .count();

        long totalEmployees = employeeRepository.count();
        long activeEmployees = employeeRepository.findAll().stream()
                .filter(com.example.demo.employee.entity.Employee::isActive)
                .count();

        Map<String, Object> result = new HashMap<>();
        result.put("organizations", Map.of(
                "total", totalOrgs,
                "active", activeOrgs,
                "suspended", suspendedOrgs
        ));
        result.put("companies", Map.of(
                "total", totalCompanies,
                "headOffices", headOffices,
                "branches", branches,
                "active", activeCompanies
        ));
        result.put("employees", Map.of(
                "total", totalEmployees,
                "active", activeEmployees
        ));
        return ResponseEntity.ok(result);
    }
}
