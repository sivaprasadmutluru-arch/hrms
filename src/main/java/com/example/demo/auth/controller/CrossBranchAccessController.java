package com.example.demo.auth.controller;

import com.example.demo.auth.entity.CrossBranchAccessGrant;
import com.example.demo.auth.service.CrossBranchAccessService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Allows Head Office admins to grant/revoke cross-branch data access for specific users.
 */
@RestController
@RequestMapping("/api/cross-branch-access")
@RequiredArgsConstructor
@Tag(name = "Cross-Branch Access")
public class CrossBranchAccessController {

    private final CrossBranchAccessService crossBranchAccessService;

    /**
     * Grant user access to a specific branch's data.
     * Only HEAD OFFICE admins (ENTERPRISE_ADMIN) or Platform Super Admin can do this.
     */
    @PostMapping("/grant")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    public ResponseEntity<CrossBranchAccessGrant> grant(
            @RequestParam Long userId,
            @RequestParam Long targetCompanyId,
            @RequestParam Long grantedByCompanyId,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(
                crossBranchAccessService.grantAccess(userId, targetCompanyId, grantedByCompanyId, reason)
        );
    }

    /**
     * Revoke cross-branch access for a user.
     */
    @DeleteMapping("/revoke")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    public ResponseEntity<Map<String, String>> revoke(
            @RequestParam Long userId,
            @RequestParam Long targetCompanyId) {
        crossBranchAccessService.revokeAccess(userId, targetCompanyId);
        return ResponseEntity.ok(Map.of("message", "Access revoked"));
    }

    /**
     * View all cross-branch grants for a specific user.
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<List<CrossBranchAccessGrant>> getUserGrants(@PathVariable Long userId) {
        return ResponseEntity.ok(crossBranchAccessService.getUserGrants(userId));
    }
}
