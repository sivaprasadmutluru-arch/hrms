package com.example.demo.auth.controller;

import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserGroup;
import com.example.demo.auth.repository.UserGroupRepository;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.base.repository.CompanyRepository;
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
 * Manages permission groups.
 * Groups bundle a set of permission codes and can be assigned to many users.
 * Users inherit all permissions from every group they belong to.
 */
@RestController
@RequestMapping("/api/user-groups")
@RequiredArgsConstructor
@Tag(name = "User Groups")
public class UserGroupController {

    private final UserGroupRepository userGroupRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    // ─── Group CRUD ──────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "List all permission groups (optionally by company)")
    public ResponseEntity<List<UserGroup>> list(@RequestParam(required = false) Long companyId) {
        if (companyId != null) {
            return ResponseEntity.ok(userGroupRepository.findByCompanyId(companyId));
        }
        return ResponseEntity.ok(userGroupRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get a permission group by ID")
    public ResponseEntity<UserGroup> get(@PathVariable Long id) {
        return ResponseEntity.ok(userGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UserGroup", id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Create a permission group")
    public ResponseEntity<UserGroup> create(@RequestBody UserGroup group) {
        if (group.getCompany() != null && group.getCompany().getId() != null) {
            group.setCompany(companyRepository.getReferenceById(group.getCompany().getId()));
        }
        group.getMembers().clear(); // members managed via separate endpoints
        return ResponseEntity.ok(userGroupRepository.save(group));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Update a permission group (name, description, permissions)")
    public ResponseEntity<UserGroup> update(@PathVariable Long id, @RequestBody UserGroup updated) {
        UserGroup group = userGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UserGroup", id));
        group.setName(updated.getName());
        group.setDescription(updated.getDescription());
        group.setPermissions(updated.getPermissions());
        return ResponseEntity.ok(userGroupRepository.save(group));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Delete a permission group")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        UserGroup group = userGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UserGroup", id));
        group.getMembers().clear();
        userGroupRepository.delete(group);
        return ResponseEntity.ok(Map.of("message", "Group deleted"));
    }

    // ─── Member Management ───────────────────────────────────────────────────

    @GetMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "List members of a group")
    public ResponseEntity<List<User>> listMembers(@PathVariable Long id) {
        UserGroup group = userGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UserGroup", id));
        return ResponseEntity.ok(List.copyOf(group.getMembers()));
    }

    @PostMapping("/{id}/members/{userId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Add a user to a group")
    public ResponseEntity<Map<String, String>> addMember(@PathVariable Long id, @PathVariable Long userId) {
        UserGroup group = userGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UserGroup", id));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        group.getMembers().add(user);
        userGroupRepository.save(group);
        return ResponseEntity.ok(Map.of("message", "User added to group"));
    }

    @DeleteMapping("/{id}/members/{userId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Remove a user from a group")
    public ResponseEntity<Map<String, String>> removeMember(@PathVariable Long id, @PathVariable Long userId) {
        UserGroup group = userGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UserGroup", id));
        group.getMembers().removeIf(u -> u.getId().equals(userId));
        userGroupRepository.save(group);
        return ResponseEntity.ok(Map.of("message", "User removed from group"));
    }

    @PostMapping("/{id}/members/bulk-assign")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    @Operation(summary = "Bulk assign users to a group")
    public ResponseEntity<Map<String, Object>> bulkAssign(@PathVariable Long id,
                                                           @RequestBody List<Long> userIds) {
        UserGroup group = userGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UserGroup", id));
        List<User> users = userRepository.findAllById(userIds);
        group.getMembers().addAll(users);
        userGroupRepository.save(group);
        return ResponseEntity.ok(Map.<String, Object>of("message", "Users assigned", "count", users.size()));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get all groups a user belongs to")
    public ResponseEntity<List<UserGroup>> getUserGroups(@PathVariable Long userId) {
        return ResponseEntity.ok(userGroupRepository.findByMembersId(userId));
    }
}
