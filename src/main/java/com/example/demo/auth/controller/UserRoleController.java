package com.example.demo.auth.controller;

import com.example.demo.auth.dto.AssignRoleRequest;
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
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
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

    @PostMapping("/assign")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Assign a role to a user in a company with an access scope")
    public ResponseEntity<UserRoleDto> assign(@Valid @RequestBody AssignRoleRequest request) {
        return ResponseEntity.ok(userRoleService.assignRole(request));
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
