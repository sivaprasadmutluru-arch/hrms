package com.example.demo.auth.controller;

import com.example.demo.auth.dto.AssignRoleRequest;
import com.example.demo.auth.dto.BulkAssignRoleRequest;
import com.example.demo.auth.dto.UserRoleDto;
import com.example.demo.auth.service.UserRoleService;
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
@RequestMapping("/api/user-roles")
@RequiredArgsConstructor
@Tag(name = "User Role Management")
public class UserRoleController {

    private final UserRoleService userRoleService;

    @GetMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Get all user-role assignments")
    public ResponseEntity<List<UserRoleDto>> getAll() {
        return ResponseEntity.ok(userRoleService.getAllAssignments());
    }

    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Get all users (for dropdowns)")
    public ResponseEntity<List<Map<String, Object>>> getUsers() {
        return ResponseEntity.ok(userRoleService.getAllUsers());
    }

    @GetMapping("/{assignmentId}/effective-access")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN')")
    public ResponseEntity<Map<String, Object>> effectiveAccess(@PathVariable Long assignmentId) {
        return ResponseEntity.ok(userRoleService.effectiveAccess(assignmentId));
    }

    @GetMapping("/migration/dry-run")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_SUPER_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> migrationDryRun() {
        return ResponseEntity.ok(userRoleService.migrationDryRun());
    }

    @PutMapping("/account-managers/{userId}/limit")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> updateAccountManagerLimit(@PathVariable Long userId,
                                                                          @RequestBody Map<String, Integer> body) {
        Integer limit = body.get("limit");
        if (limit == null) throw new IllegalArgumentException("limit is required");
        return ResponseEntity.ok(userRoleService.updateAccountManagerLimit(userId, limit));
    }

    @PostMapping("/assign")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Assign a role to a user in a company with an access scope")
    public ResponseEntity<UserRoleDto> assign(@Valid @RequestBody AssignRoleRequest request) {
        return ResponseEntity.ok(userRoleService.assignRole(request));
    }

    @PostMapping("/assign-multiple")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "Assign Super Admin or Account Manager access to multiple companies atomically")
    public ResponseEntity<List<UserRoleDto>> assignMultiple(@Valid @RequestBody BulkAssignRoleRequest request) {
        return ResponseEntity.ok(userRoleService.assignMultipleCompanies(request));
    }

    @DeleteMapping("/revoke")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Revoke a role from a user in a company")
    public ResponseEntity<Map<String, String>> revoke(@RequestParam Long userId,
                                                       @RequestParam Long roleId,
                                                       @RequestParam Long companyId) {
        userRoleService.revokeRole(userId, roleId, companyId);
        return ResponseEntity.ok(Map.of("message", "Role revoked successfully"));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Get all roles assigned to a user")
    public ResponseEntity<List<UserRoleDto>> getUserRoles(@PathVariable Long userId) {
        return ResponseEntity.ok(userRoleService.getUserRoles(userId));
    }

    @GetMapping("/company/{companyId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Get all user-role assignments for a company")
    public ResponseEntity<List<UserRoleDto>> getCompanyUsers(@PathVariable Long companyId) {
        return ResponseEntity.ok(userRoleService.getCompanyUsers(companyId));
    }
}
