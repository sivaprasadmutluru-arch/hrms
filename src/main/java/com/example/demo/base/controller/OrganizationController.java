package com.example.demo.base.controller;

import com.example.demo.base.entity.Organization;
import com.example.demo.base.enums.SubscriptionPlan;
import com.example.demo.base.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Manages client organizations on the Prabha Tech platform.
 * All endpoints here are restricted to PLATFORM_SUPER_ADMIN only.
 *
 * An organization is the top-level tenant:
 *   Organization "ABC Corp" → Head Office → Branches
 */
@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
@Tag(name = "Organizations (Prabha Tech Admin)")
public class OrganizationController {

    private final OrganizationService organizationService;

    @GetMapping
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "List all client organizations")
    public ResponseEntity<List<Organization>> list() {
        return ResponseEntity.ok(organizationService.getAllOrganizations());
    }

    @GetMapping("/without-head-office")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "List organizations that don't yet have a Head Office")
    public ResponseEntity<List<Organization>> listWithoutHeadOffice() {
        return ResponseEntity.ok(organizationService.getOrganizationsWithoutHeadOffice());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Get organization details")
    public ResponseEntity<Organization> get(@PathVariable Long id) {
        return ResponseEntity.ok(organizationService.getOrganizationById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Create a new client organization")
    public ResponseEntity<Organization> create(@Valid @RequestBody Organization organization) {
        return ResponseEntity.ok(organizationService.createOrganization(organization));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Update organization details")
    public ResponseEntity<Organization> update(@PathVariable Long id,
                                                @RequestBody Organization updated) {
        return ResponseEntity.ok(organizationService.updateOrganization(id, updated));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Activate an organization and all its companies")
    public ResponseEntity<Map<String, String>> activate(@PathVariable Long id) {
        organizationService.activateOrganization(id);
        return ResponseEntity.ok(Map.of("message", "Organization activated"));
    }

    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Suspend an organization (disables all its companies)")
    public ResponseEntity<Map<String, String>> suspend(@PathVariable Long id) {
        organizationService.suspendOrganization(id);
        return ResponseEntity.ok(Map.of("message", "Organization suspended"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Delete an organization (must have no companies)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        organizationService.deleteOrganization(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/stats")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Get stats for an organization: branch count, employee count")
    public ResponseEntity<Map<String, Object>> stats(@PathVariable Long id) {
        return ResponseEntity.ok(organizationService.getOrganizationStats(id));
    }

    @GetMapping("/{id}/plan-limits")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Get current plan limits and usage for an organization")
    public ResponseEntity<Map<String, Object>> planLimits(@PathVariable Long id) {
        return ResponseEntity.ok(organizationService.getPlanLimits(id));
    }

    @PostMapping("/{id}/subscription")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Update subscription plan for an organization (BASIC / STANDARD / ENTERPRISE)")
    public ResponseEntity<Organization> updateSubscription(@PathVariable Long id,
                                                           @RequestParam SubscriptionPlan plan) {
        return ResponseEntity.ok(organizationService.updateSubscriptionPlan(id, plan));
    }

    @PostMapping("/{id}/logo")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Upload logo for an organization")
    public ResponseEntity<Map<String, String>> uploadLogo(@PathVariable Long id,
                                                          @RequestParam("file") MultipartFile file) {
        Organization org = organizationService.uploadLogo(id, file);
        return ResponseEntity.ok(Map.of("logoPath", org.getLogoPath(), "url", "/api/files/" + org.getLogoPath()));
    }
}
