package com.example.demo.auth.service;

import com.example.demo.auth.dto.AssignRoleRequest;
import com.example.demo.auth.dto.UserRoleDto;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.RoleRepository;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Handles assigning and revoking roles from users.
 *
 * Who can assign what:
 *   PLATFORM_SUPER_ADMIN → can assign any role to anyone
 *   ENTERPRISE_ADMIN     → can assign BRANCH_ADMIN, HR_MANAGER, ACCOUNTANT, DEPARTMENT_MANAGER, TEAM_LEAD, EMPLOYEE
 *   BRANCH_ADMIN         → can assign DEPARTMENT_MANAGER, TEAM_LEAD, EMPLOYEE within their branch
 *
 * These rules are enforced via @PreAuthorize on the controller.
 * This service only enforces data integrity rules.
 */
@Service
@RequiredArgsConstructor
public class UserRoleService {

    private final UserRoleRepository userRoleRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CompanyRepository companyRepository;

    @Transactional
    public UserRoleDto assignRole(AssignRoleRequest request) {
        // Validate user exists
        userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.getUserId()));

        // Validate role exists
        Role role = roleRepository.findByName(request.getRoleName())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + request.getRoleName()));

        // Validate company exists
        companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", request.getCompanyId()));

        // Enforce role assignment privilege: BRANCH_ADMIN cannot assign ENTERPRISE_ADMIN or above
        AccessScopeContext.ScopeData callerScope = AccessScopeContext.get();
        if (callerScope != null && !callerScope.hasUnrestrictedAccess()) {
            validateRoleAssignmentPrivilege(callerScope.getScope(), request.getRoleName());
        }

        // Check if this exact assignment already exists
        List<UserRole> existing = userRoleRepository.findByUserIdAndCompanyId(
                request.getUserId(), request.getCompanyId());
        boolean alreadyAssigned = existing.stream()
                .anyMatch(ur -> ur.getRole().getName().equals(request.getRoleName()));
        if (alreadyAssigned) {
            throw new BadRequestException("User already has the " + request.getRoleName() +
                    " role in this company");
        }

        // For ENTERPRISE or HEAD_OFFICE scope, the role must be anchored to the Head Office
        // so the interceptor can correctly expand access to all branches.
        // If the caller picked a branch company, silently resolve to its parent HO.
        Long effectiveCompanyId = request.getCompanyId();
        if (request.getAccessScope() == UserRole.AccessScope.ENTERPRISE
                || request.getAccessScope() == UserRole.AccessScope.HEAD_OFFICE) {
            Company selectedCompany = companyRepository.findById(request.getCompanyId()).orElseThrow();
            if (selectedCompany.isBranch() && selectedCompany.getParentCompanyId() != null) {
                effectiveCompanyId = selectedCompany.getParentCompanyId();
            }
        }

        UserRole userRole = new UserRole();
        userRole.setUser(userRepository.getReferenceById(request.getUserId()));
        userRole.setRole(role);
        userRole.setCompany(companyRepository.getReferenceById(effectiveCompanyId));
        userRole.setAccessScope(request.getAccessScope());

        UserRole saved = userRoleRepository.save(userRole);
        // Eagerly load associations before transaction ends so DTO can map them
        saved.setUser(userRepository.findById(request.getUserId()).orElseThrow());
        saved.setCompany(companyRepository.findById(effectiveCompanyId).orElseThrow());
        return UserRoleDto.from(saved);
    }

    public boolean hasRole(Long userId, Long companyId, Role.RoleName roleName) {
        return userRoleRepository.findByUserIdAndCompanyId(userId, companyId).stream()
                .anyMatch(ur -> ur.getRole().getName().equals(roleName));
    }

    @Transactional
    public void revokeRole(Long userId, Long roleId, Long companyId) {
        userRoleRepository.deleteByUserIdAndRoleIdAndCompanyId(userId, roleId, companyId);
    }

    @Transactional(readOnly = true)
    public List<UserRoleDto> getAllAssignments() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        // Platform super admin (unrestricted) or no scope context → return everything
        if (scope == null || scope.hasUnrestrictedAccess()) {
            return userRoleRepository.findAll().stream()
                    .map(UserRoleDto::from)
                    .collect(Collectors.toList());
        }
        // Enterprise/Branch admin → only return user roles within their accessible companies
        return userRoleRepository.findByCompanyIdIn(scope.getAccessibleCompanyIds()).stream()
                .map(UserRoleDto::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserRoleDto> getUserRoles(Long userId) {
        return userRoleRepository.findByUserId(userId).stream()
                .map(UserRoleDto::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserRoleDto> getCompanyUsers(Long companyId) {
        return userRoleRepository.findByCompanyId(companyId).stream()
                .map(UserRoleDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Enforces which roles a caller is allowed to assign based on their own access scope.
     *   PLATFORM_SUPER_ADMIN (unrestricted) → can assign any role (checked upstream — never reaches here)
     *   ENTERPRISE / HEAD_OFFICE scope      → can assign up to BRANCH_ADMIN
     *   BRANCH scope                        → can only assign DEPARTMENT_MANAGER, TEAM_LEAD, EMPLOYEE
     */
    private void validateRoleAssignmentPrivilege(UserRole.AccessScope callerScope, Role.RoleName targetRole) {
        Set<Role.RoleName> enterpriseCanAssign = EnumSet.of(
                Role.RoleName.BRANCH_ADMIN, Role.RoleName.HR_MANAGER, Role.RoleName.ACCOUNTANT,
                Role.RoleName.DEPARTMENT_MANAGER, Role.RoleName.TEAM_LEAD, Role.RoleName.EMPLOYEE
        );
        Set<Role.RoleName> branchCanAssign = EnumSet.of(
                Role.RoleName.DEPARTMENT_MANAGER, Role.RoleName.TEAM_LEAD, Role.RoleName.EMPLOYEE
        );
        if (callerScope == UserRole.AccessScope.ENTERPRISE || callerScope == UserRole.AccessScope.HEAD_OFFICE) {
            if (!enterpriseCanAssign.contains(targetRole)) {
                throw new BadRequestException("Enterprise Admin cannot assign role: " + targetRole +
                        ". Only PLATFORM_SUPER_ADMIN can assign that role.");
            }
        } else if (callerScope == UserRole.AccessScope.BRANCH) {
            if (!branchCanAssign.contains(targetRole)) {
                throw new BadRequestException("Branch Admin cannot assign role: " + targetRole +
                        ". Branch Admin can only assign DEPARTMENT_MANAGER, TEAM_LEAD, or EMPLOYEE.");
            }
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllUsers() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();

        java.util.stream.Stream<com.example.demo.auth.entity.User> userStream;

        if (scope == null || scope.hasUnrestrictedAccess()) {
            // Platform super admin: show all users
            userStream = userRepository.findAll().stream();
        } else {
            // Enterprise/Branch admin: show only users who have a role within accessible companies
            userStream = userRoleRepository.findByCompanyIdIn(scope.getAccessibleCompanyIds()).stream()
                    .map(UserRole::getUser)
                    .distinct();
        }

        return userStream.map(u -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", u.getId());
            map.put("username", u.getUsername());
            map.put("email", u.getEmail());
            map.put("firstName", u.getFirstName() != null ? u.getFirstName() : "");
            map.put("lastName", u.getLastName() != null ? u.getLastName() : "");
            return map;
        }).collect(Collectors.toList());
    }
}
