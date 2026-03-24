package com.example.demo.hrpolicy.controller;

import com.example.demo.employee.entity.PolicyMultipleFile;
import com.example.demo.employee.repository.PolicyMultipleFileRepository;
import com.example.demo.hrpolicy.entity.HrPolicy;
import com.example.demo.hrpolicy.service.HrPolicyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hr-policies")
@RequiredArgsConstructor
@Tag(name = "HR Policies")
public class HrPolicyController {

    private final HrPolicyService hrPolicyService;
    private final PolicyMultipleFileRepository policyMultipleFileRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('employee:view')")
    public ResponseEntity<List<HrPolicy>> list() {
        return ResponseEntity.ok(hrPolicyService.getVisiblePolicies());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<HrPolicy> create(
            @RequestParam Long companyId,
            @RequestBody HrPolicy policy) {
        return ResponseEntity.ok(hrPolicyService.create(policy, companyId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<HrPolicy> update(@PathVariable Long id, @RequestBody HrPolicy updated) {
        return ResponseEntity.ok(hrPolicyService.update(id, updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        hrPolicyService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Policy deactivated"));
    }

    @PutMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<HrPolicy> publish(@PathVariable Long id) {
        return ResponseEntity.ok(hrPolicyService.publish(id));
    }

    @PutMapping("/{id}/unpublish")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<HrPolicy> unpublish(@PathVariable Long id) {
        return ResponseEntity.ok(hrPolicyService.unpublish(id));
    }

    @PutMapping("/{id}/make-organization-wide")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    public ResponseEntity<HrPolicy> makeOrganizationWide(
            @PathVariable Long id,
            @RequestParam Long companyId) {
        return ResponseEntity.ok(hrPolicyService.makeOrganizationWide(id, companyId));
    }

    @PutMapping("/{id}/make-branch-only")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    public ResponseEntity<HrPolicy> makeBranchOnly(
            @PathVariable Long id,
            @RequestParam Long companyId) {
        return ResponseEntity.ok(hrPolicyService.makeBranchOnly(id, companyId));
    }

    @GetMapping("/inherited")
    @PreAuthorize("hasAuthority('employee:view')")
    public ResponseEntity<List<HrPolicy>> inherited() {
        return ResponseEntity.ok(hrPolicyService.getInheritedPolicies());
    }

    // ─── Policy File Attachments ──────────────────────────────────────────────

    @GetMapping("/{policyId}/files")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List files attached to an HR policy")
    public ResponseEntity<List<PolicyMultipleFile>> listFiles(@PathVariable Long policyId) {
        return ResponseEntity.ok(policyMultipleFileRepository.findByPolicyId(policyId));
    }

    @PostMapping("/{policyId}/files")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Attach a file reference to an HR policy")
    public ResponseEntity<PolicyMultipleFile> addFile(
            @PathVariable Long policyId,
            @RequestBody PolicyMultipleFile file) {
        file.setPolicyId(policyId);
        return ResponseEntity.ok(policyMultipleFileRepository.save(file));
    }

    @DeleteMapping("/files/{fileId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Remove a file attachment from an HR policy")
    public ResponseEntity<Map<String, String>> deleteFile(@PathVariable Long fileId) {
        policyMultipleFileRepository.deleteById(fileId);
        return ResponseEntity.ok(Map.of("message", "File deleted"));
    }
}
