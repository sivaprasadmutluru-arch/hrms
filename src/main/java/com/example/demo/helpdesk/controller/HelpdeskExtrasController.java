package com.example.demo.helpdesk.controller;

import com.example.demo.helpdesk.entity.*;
import com.example.demo.helpdesk.service.HelpdeskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/helpdesk")
@RequiredArgsConstructor
@Tag(name = "Helpdesk Extras")
public class HelpdeskExtrasController {

    private final HelpdeskService helpdeskService;

    // ─── Claims ───────────────────────────────────────────────────────────────

    @GetMapping("/claims")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "List claim requests (company-scoped)")
    public ResponseEntity<List<ClaimRequest>> listClaims() {
        return ResponseEntity.ok(helpdeskService.listClaims());
    }

    @PostMapping("/claims")
    @PreAuthorize("hasAuthority('helpdesk:create')")
    @Operation(summary = "Submit a claim request")
    public ResponseEntity<ClaimRequest> createClaim(@RequestBody ClaimRequest claim) {
        return ResponseEntity.ok(helpdeskService.createClaim(claim));
    }

    @PostMapping("/claims/{id}/approve")
    @PreAuthorize("hasAuthority('helpdesk:approve')")
    @Operation(summary = "Approve a claim request")
    public ResponseEntity<ClaimRequest> approveClaim(@PathVariable Long id) {
        return ResponseEntity.ok(helpdeskService.approveClaim(id));
    }

    @PostMapping("/claims/{id}/reject")
    @PreAuthorize("hasAuthority('helpdesk:approve')")
    @Operation(summary = "Reject a claim request")
    public ResponseEntity<ClaimRequest> rejectClaim(@PathVariable Long id) {
        return ResponseEntity.ok(helpdeskService.rejectClaim(id));
    }

    // ─── FAQ Categories ───────────────────────────────────────────────────────

    @GetMapping("/faq-categories")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "List FAQ categories (company-scoped)")
    public ResponseEntity<List<FAQCategory>> listFAQCategories() {
        return ResponseEntity.ok(helpdeskService.listFAQCategories());
    }

    @PostMapping("/faq-categories")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a FAQ category")
    public ResponseEntity<FAQCategory> createFAQCategory(@RequestBody FAQCategory category) {
        return ResponseEntity.ok(helpdeskService.createFAQCategory(category));
    }

    @PutMapping("/faq-categories/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update a FAQ category")
    public ResponseEntity<FAQCategory> updateFAQCategory(@PathVariable Long id, @RequestBody FAQCategory updated) {
        return ResponseEntity.ok(helpdeskService.updateFAQCategory(id, updated));
    }

    @DeleteMapping("/faq-categories/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a FAQ category")
    public ResponseEntity<Map<String, String>> deleteFAQCategory(@PathVariable Long id) {
        helpdeskService.deleteFAQCategory(id);
        return ResponseEntity.ok(Map.of("message", "FAQ category deleted"));
    }

    // ─── FAQs ─────────────────────────────────────────────────────────────────

    @GetMapping("/faqs")
    @PreAuthorize("hasAuthority('helpdesk:view')")
    @Operation(summary = "List FAQs (optionally by category)")
    public ResponseEntity<List<FAQ>> listFAQs(@RequestParam(required = false) Long categoryId) {
        return ResponseEntity.ok(helpdeskService.listFAQs(categoryId));
    }

    @PostMapping("/faqs")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a FAQ")
    public ResponseEntity<FAQ> createFAQ(@RequestBody FAQ faq) {
        return ResponseEntity.ok(helpdeskService.createFAQ(faq));
    }

    @PutMapping("/faqs/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update a FAQ")
    public ResponseEntity<FAQ> updateFAQ(@PathVariable Long id, @RequestBody FAQ updated) {
        return ResponseEntity.ok(helpdeskService.updateFAQ(id, updated));
    }

    @DeleteMapping("/faqs/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a FAQ")
    public ResponseEntity<Map<String, String>> deleteFAQ(@PathVariable Long id) {
        helpdeskService.deleteFAQ(id);
        return ResponseEntity.ok(Map.of("message", "FAQ deleted"));
    }

    // ─── Department Managers ──────────────────────────────────────────────────

    @GetMapping("/department-managers")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "List helpdesk department managers (company-scoped)")
    public ResponseEntity<List<DepartmentManager>> listDepartmentManagers(
            @RequestParam(required = false) Long departmentId) {
        return ResponseEntity.ok(helpdeskService.listDepartmentManagers(departmentId));
    }

    @PostMapping("/department-managers")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Assign a manager to a department for helpdesk")
    public ResponseEntity<DepartmentManager> assignDepartmentManager(@RequestBody DepartmentManager dm) {
        return ResponseEntity.ok(helpdeskService.assignDepartmentManager(dm));
    }

    @DeleteMapping("/department-managers/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Remove a department manager assignment")
    public ResponseEntity<Void> removeDepartmentManager(@PathVariable Long id) {
        helpdeskService.removeDepartmentManager(id);
        return ResponseEntity.noContent().build();
    }
}
