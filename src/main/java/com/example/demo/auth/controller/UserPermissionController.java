package com.example.demo.auth.controller;

import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserPermissionOverride;
import com.example.demo.auth.repository.UserPermissionOverrideRepository;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Fine-grained per-user permission management.
 * Allows admins to explicitly grant or revoke individual permission codes
 * for specific users, independent of their assigned role.
 */
@RestController
@RequestMapping("/api/user-permissions")
@RequiredArgsConstructor
@Tag(name = "User Permissions")
public class UserPermissionController {

    private final UserPermissionOverrideRepository permissionOverrideRepository;
    private final UserRepository userRepository;

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get all permission overrides for a user")
    public ResponseEntity<List<UserPermissionOverride>> getUserPermissions(@PathVariable Long userId) {
        return ResponseEntity.ok(permissionOverrideRepository.findByUserId(userId));
    }

    @PostMapping("/grant")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Grant a specific permission to a user")
    public ResponseEntity<UserPermissionOverride> grantPermission(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String permissionCode = body.get("permissionCode").toString();
        String reason = body.containsKey("reason") ? body.get("reason").toString() : null;

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        UserPermissionOverride override = permissionOverrideRepository
                .findByUserIdAndPermissionCode(userId, permissionCode)
                .orElseGet(() -> {
                    UserPermissionOverride o = new UserPermissionOverride();
                    o.setUser(user);
                    o.setPermissionCode(permissionCode);
                    return o;
                });
        override.setGranted(true);
        override.setReason(reason);
        return ResponseEntity.ok(permissionOverrideRepository.save(override));
    }

    @PostMapping("/revoke")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Revoke a specific permission from a user")
    public ResponseEntity<UserPermissionOverride> revokePermission(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String permissionCode = body.get("permissionCode").toString();
        String reason = body.containsKey("reason") ? body.get("reason").toString() : null;

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        UserPermissionOverride override = permissionOverrideRepository
                .findByUserIdAndPermissionCode(userId, permissionCode)
                .orElseGet(() -> {
                    UserPermissionOverride o = new UserPermissionOverride();
                    o.setUser(user);
                    o.setPermissionCode(permissionCode);
                    return o;
                });
        override.setGranted(false);
        override.setReason(reason);
        return ResponseEntity.ok(permissionOverrideRepository.save(override));
    }

    @DeleteMapping("/user/{userId}/permission/{permissionCode}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Remove a permission override (revert to role-based default)")
    public ResponseEntity<Map<String, String>> removeOverride(@PathVariable Long userId,
                                                               @PathVariable String permissionCode) {
        permissionOverrideRepository.deleteByUserIdAndPermissionCode(userId, permissionCode);
        return ResponseEntity.ok(Map.of("message", "Permission override removed"));
    }
}
