package com.example.demo.auth.service;

import com.example.demo.auth.dto.AssignRoleRequest;
import com.example.demo.auth.dto.BulkAssignRoleRequest;
import com.example.demo.auth.dto.UserRoleDto;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.RoleRepository;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.DepartmentRepository;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.audit.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.time.LocalDate;

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
    private final EmployeeCompanyGuard employeeCompanyGuard;
    private final AuditService auditService;
    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public UserRoleDto assignRole(AssignRoleRequest request) {
        requireCompanyAccess(request.getCompanyId());
        var targetUser = userRepository.findByIdForUpdate(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.getUserId()));

        // Validate role exists
        Role role = roleRepository.findByName(request.getRoleName())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + request.getRoleName()));

        // Validate company exists
        Company selectedCompany = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", request.getCompanyId()));

        validateDates(request);
        validateCanonicalGrantAuthority(request.getRoleName(), request.getUserId());
        validateScopeShape(request, selectedCompany);
        validateEmploymentCompanyForCompanyRole(request);

        // Enforce role assignment privilege: BRANCH_ADMIN cannot assign ENTERPRISE_ADMIN or above
        if (request.getRoleName() == Role.RoleName.EMPLOYEE) {
            employeeCompanyGuard.validateEmployment(request.getUserId(), request.getCompanyId());
        }
        AccessScopeContext.ScopeData callerScope = AccessScopeContext.get();
        if (callerScope != null && !callerScope.hasUnrestrictedAccess()) {
            validateRoleAssignmentPrivilege(callerScope.getScope(), request.getRoleName());
        }

        // Check if this exact assignment already exists
        // For ENTERPRISE or HEAD_OFFICE scope, the role must be anchored to the Head Office
        // so the interceptor can correctly expand access to all branches.
        // If the caller picked a branch company, silently resolve to its parent HO.
        Long effectiveCompanyId = request.getCompanyId();
        if (request.getAccessScope() == UserRole.AccessScope.ENTERPRISE
                || request.getAccessScope() == UserRole.AccessScope.HEAD_OFFICE) {
            if (selectedCompany.isBranch() && selectedCompany.getParentCompanyId() != null) {
                effectiveCompanyId = selectedCompany.getParentCompanyId();
            }
        }

        List<UserRole> existing = userRoleRepository.findByUserIdAndCompanyId(request.getUserId(), effectiveCompanyId);
        UserRole matchingAssignment = existing.stream()
                .filter(ur -> ur.getRole().getName().equals(request.getRoleName()))
                .findFirst()
                .orElse(null);
        if (matchingAssignment != null
                && matchingAssignment.isActive()
                && matchingAssignment.getAssignmentStatus() == UserRole.AssignmentStatus.ACTIVE) {
            throw new BadRequestException("User already has the " + request.getRoleName() + " role in this company");
        }

        if (request.getRoleName() == Role.RoleName.ACCOUNT_MANAGER) {
            long assigned = userRoleRepository.countActiveCompanies(request.getUserId(), Role.RoleName.ACCOUNT_MANAGER,
                    LocalDate.now(), UserRole.AssignmentStatus.ACTIVE);
            if (assigned >= targetUser.getAccountManagerCompanyLimit()) {
                throw new BadRequestException("Account Manager company limit reached (" + assigned + "/" +
                        targetUser.getAccountManagerCompanyLimit() + ")");
            }
        }

        // The database uniqueness rule is (user, role, company), regardless of status.
        // Reuse a revoked/expired assignment instead of inserting a duplicate row.
        UserRole userRole = matchingAssignment != null ? matchingAssignment : new UserRole();
        userRole.setUser(userRepository.getReferenceById(request.getUserId()));
        userRole.setRole(role);
        userRole.setCompany(companyRepository.getReferenceById(effectiveCompanyId));
        userRole.setAccessScope(request.getAccessScope());
        userRole.setAccessLevel(request.getAccessLevel() != null
                ? request.getAccessLevel() : UserRole.AccessLevel.FULL);
        userRole.setDepartmentId(request.getDepartmentId());
        userRole.setTeamId(request.getTeamId());
        userRole.setEmployeeScopeId(request.getEmployeeScopeId());
        userRole.setEffectiveFrom(request.getEffectiveFrom() != null ? request.getEffectiveFrom() : LocalDate.now());
        userRole.setExpiresOn(request.getExpiresOn());
        userRole.setAssignmentStatus(UserRole.AssignmentStatus.ACTIVE);
        // A revoked assignment is retained to satisfy the (user, role, company)
        // uniqueness rule.  Re-using it must restore both status fields; otherwise
        // the selector hides a row that appears ACTIVE in the roles audit screen.
        userRole.setActive(true);
        userRole.setGrantedByUserId(currentUserId());
        userRole.setAssignmentReason(request.getReason());

        UserRole saved = userRoleRepository.save(userRole);
        auditService.log("USER_ROLE", saved.getId(), "ASSIGN", null, Map.ofEntries(
                Map.entry("targetUserId", request.getUserId()),
                Map.entry("role", request.getRoleName().name()),
                Map.entry("companyId", effectiveCompanyId),
                Map.entry("scope", request.getAccessScope().name()),
                Map.entry("accessLevel", userRole.getAccessLevel().name()),
                Map.entry("effectiveFrom", userRole.getEffectiveFrom().toString()),
                Map.entry("expiresOn", userRole.getExpiresOn() == null ? "" : userRole.getExpiresOn().toString()),
                Map.entry("reason", request.getReason())));
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
        requireCompanyAccess(companyId);
        UserRole assignment = userRoleRepository.findByUserIdAndCompanyId(userId, companyId).stream()
                .filter(ur -> ur.getRole().getId().equals(roleId) && ur.getAssignmentStatus() == UserRole.AssignmentStatus.ACTIVE)
                .findFirst().orElseThrow(() -> new ResourceNotFoundException("Role assignment", roleId));
        Role.RoleName role = assignment.getRole().getName();
        if (role == Role.RoleName.SUPER_ADMIN || role == Role.RoleName.PLATFORM_SUPER_ADMIN) {
            long count = userRoleRepository.countActiveByRoleNames(
                    List.of(Role.RoleName.SUPER_ADMIN, Role.RoleName.PLATFORM_SUPER_ADMIN), UserRole.AssignmentStatus.ACTIVE);
            if (count <= 1) throw new BadRequestException("Cannot revoke the last active Super Admin");
        }
        if (role == Role.RoleName.COMPANY_ADMIN || role == Role.RoleName.ENTERPRISE_ADMIN) {
            long count = userRoleRepository.findByCompanyId(companyId).stream()
                    .filter(ur -> ur.getAssignmentStatus() == UserRole.AssignmentStatus.ACTIVE)
                    .filter(ur -> ur.getRole().getName() == Role.RoleName.COMPANY_ADMIN || ur.getRole().getName() == Role.RoleName.ENTERPRISE_ADMIN)
                    .count();
            if (count <= 1) throw new BadRequestException("Cannot revoke the last active Company Admin");
        }
        assignment.setAssignmentStatus(UserRole.AssignmentStatus.REVOKED);
        assignment.setActive(false);
        userRoleRepository.save(assignment);
        auditService.log("USER_ROLE", assignment.getId(), "REVOKE",
                Map.of("status", "ACTIVE"), Map.of("status", "REVOKED", "companyId", companyId,
                        "targetUserId", userId, "role", role.name()));
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
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        return userRoleRepository.findByUserId(userId).stream()
                .filter(ur -> scope == null || scope.hasUnrestrictedAccess()
                        || (ur.getCompany() != null && scope.canAccess(ur.getCompany().getId())))
                .map(UserRoleDto::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserRoleDto> getCompanyUsers(Long companyId) {
        requireCompanyAccess(companyId);
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
                Role.RoleName.COMPANY_ADMIN, Role.RoleName.COMPANY_MANAGER, Role.RoleName.BRANCH_ADMIN,
                Role.RoleName.HR_MANAGER, Role.RoleName.ACCOUNTS_MANAGER, Role.RoleName.ACCOUNTANT,
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

    @Transactional
    public List<UserRoleDto> assignMultipleCompanies(BulkAssignRoleRequest request) {
        requireSuperAdmin();
        if (request.getRoleName() != Role.RoleName.ACCOUNT_MANAGER
                && request.getRoleName() != Role.RoleName.SUPER_ADMIN) {
            throw new BadRequestException("Multiple-company assignment is only available for Super Admin or Account Manager");
        }
        List<Long> companyIds = request.getCompanyIds().stream().distinct().toList();
        if (companyIds.isEmpty()) throw new BadRequestException("Select at least one company");

        var targetUser = userRepository.findByIdForUpdate(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.getUserId()));
        long currentlyAssigned = request.getRoleName() == Role.RoleName.ACCOUNT_MANAGER
                ? userRoleRepository.countActiveCompanies(request.getUserId(), Role.RoleName.ACCOUNT_MANAGER,
                    LocalDate.now(), UserRole.AssignmentStatus.ACTIVE) : 0;
        long newAssignments = companyIds.stream().filter(companyId ->
                userRoleRepository.findByUserIdAndCompanyId(request.getUserId(), companyId).stream()
                        .noneMatch(ur -> ur.getRole().getName() == request.getRoleName()
                                && ur.isEffectiveOn(LocalDate.now()))).count();
        if (request.getRoleName() == Role.RoleName.ACCOUNT_MANAGER
                && currentlyAssigned + newAssignments > targetUser.getAccountManagerCompanyLimit()) {
            throw new BadRequestException("Account Manager company limit exceeded (" + currentlyAssigned +
                    " existing + " + newAssignments + " selected, maximum " +
                    targetUser.getAccountManagerCompanyLimit() + ")");
        }
        return companyIds.stream().map(companyId -> {
            Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
            AssignRoleRequest assignment = request.forCompany(companyId);
            if (request.getRoleName() == Role.RoleName.SUPER_ADMIN) {
                assignment.setAccessLevel(UserRole.AccessLevel.FULL);
            }
            assignment.setAccessScope(company.isBranch()
                    ? UserRole.AccessScope.BRANCH : UserRole.AccessScope.ENTERPRISE);
            UserRole activeAssignment = userRoleRepository.findByUserIdAndCompanyId(request.getUserId(), companyId)
                    .stream()
                    .filter(ur -> ur.getRole().getName() == request.getRoleName()
                            && ur.isActive()
                            && ur.isEffectiveOn(LocalDate.now()))
                    .findFirst()
                    .orElse(null);
            // Bulk assignment is idempotent: retain companies that are already assigned
            // and continue processing the remaining selections.
            if (activeAssignment != null) {
                return UserRoleDto.from(activeAssignment);
            }
            return assignRole(assignment);
        }).toList();
    }

    @Transactional
    public Map<String, Object> updateAccountManagerLimit(Long userId, int limit) {
        requireSuperAdmin();
        if (limit < 1 || limit > 100) throw new BadRequestException("Assignment limit must be between 1 and 100");
        var user = userRepository.findByIdForUpdate(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        long assigned = userRoleRepository.countActiveCompanies(userId, Role.RoleName.ACCOUNT_MANAGER,
                LocalDate.now(), UserRole.AssignmentStatus.ACTIVE);
        user.setAccountManagerCompanyLimit(limit);
        userRepository.save(user);
        auditService.log("ACCOUNT_MANAGER_LIMIT", userId, "UPDATE", null,
                Map.of("configuredMaximum", limit, "assignedCompanyCount", assigned,
                        "overLimit", assigned > limit));
        return Map.of("userId", userId, "configuredMaximum", limit, "assignedCompanyCount", assigned,
                "overLimit", assigned > limit);
    }

    private void validateDates(AssignRoleRequest request) {
        if (request.getExpiresOn() != null && request.getEffectiveFrom() != null
                && request.getExpiresOn().isBefore(request.getEffectiveFrom())) {
            throw new BadRequestException("Expiry cannot be before effective date");
        }
        if (request.getReason() == null || request.getReason().isBlank()) {
            throw new BadRequestException("Assignment reason is required");
        }
    }

    private void validateCanonicalGrantAuthority(Role.RoleName targetRole, Long targetUserId) {
        Set<String> roles = currentAuthorities();
        if (roles.contains("ROLE_COMPANY_MANAGER")) throw new BadRequestException("Company Managers cannot assign roles");
        if (targetRole == Role.RoleName.SUPER_ADMIN || targetRole == Role.RoleName.PLATFORM_SUPER_ADMIN
                || targetRole == Role.RoleName.ACCOUNT_MANAGER) requireSuperAdmin();
        if (targetUserId.equals(currentUserId()) && (targetRole == Role.RoleName.SUPER_ADMIN
                || targetRole == Role.RoleName.PLATFORM_SUPER_ADMIN || targetRole == Role.RoleName.ACCOUNT_MANAGER)) {
            throw new BadRequestException("Self-escalation is not allowed");
        }
    }

    private void validateScopeShape(AssignRoleRequest request, Company company) {
        if (request.getAccessScope() == null) throw new BadRequestException("An explicit access scope is required");
        switch (request.getRoleName()) {
            case ACCOUNT_MANAGER, SUPER_ADMIN -> {
                if (request.getAccessScope() != UserRole.AccessScope.ENTERPRISE
                        && request.getAccessScope() != UserRole.AccessScope.HEAD_OFFICE
                        && request.getAccessScope() != UserRole.AccessScope.BRANCH)
                    throw new BadRequestException(request.getRoleName() + " requires company-wide or branch scope");
            }
            case COMPANY_ADMIN, CEO, COMPANY_MANAGER -> {
                if (request.getAccessScope() != UserRole.AccessScope.ENTERPRISE
                        && request.getAccessScope() != UserRole.AccessScope.HEAD_OFFICE)
                    throw new BadRequestException(request.getRoleName() + " requires company-wide scope");
            }
            case DEPARTMENT_MANAGER, TEAM_LEAD -> {
                if (request.getAccessScope() != UserRole.AccessScope.DEPARTMENT || request.getDepartmentId() == null)
                    throw new BadRequestException("Department Manager requires a department scope");
            }
            case EMPLOYEE -> {
                if (request.getAccessScope() != UserRole.AccessScope.SELF)
                    throw new BadRequestException("Employee requires SELF scope");
            }
            default -> { }
        }
        if (request.getAccessLevel() == UserRole.AccessLevel.PARTIAL
                && request.getRoleName() != Role.RoleName.ACCOUNT_MANAGER) {
            throw new BadRequestException("Partial company access is only available for Account Manager");
        }
        if ((request.getAccessScope() == UserRole.AccessScope.ENTERPRISE || request.getAccessScope() == UserRole.AccessScope.HEAD_OFFICE)
                && !company.isHeadOffice() && company.getParentCompanyId() == null)
            throw new BadRequestException("Company-wide assignments must belong to a valid company tree");
        if (request.getDepartmentId() != null) {
            var department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new BadRequestException("Department does not exist"));
            if (department.getCompany() == null || !department.getCompany().getId().equals(company.getId()))
                throw new BadRequestException("Department does not belong to the selected company");
        }
        if (request.getEmployeeScopeId() != null) {
            var employee = employeeRepository.findById(request.getEmployeeScopeId())
                    .orElseThrow(() -> new BadRequestException("Employee scope does not exist"));
            if (employee.getCompany() == null || !employee.getCompany().getId().equals(company.getId()))
                throw new BadRequestException("Employee scope does not belong to the selected company");
        }
    }

    private Long currentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof UserPrincipal up)) throw new BadRequestException("Authenticated user is required");
        return up.getId();
    }

    private void validateEmploymentCompanyForCompanyRole(AssignRoleRequest request) {
        if (request.getRoleName() == Role.RoleName.SUPER_ADMIN
                || request.getRoleName() == Role.RoleName.ACCOUNT_MANAGER
                || request.getRoleName() == Role.RoleName.EMPLOYEE) return;
        Long employmentCompanyId = userRoleRepository.findByUserId(request.getUserId()).stream()
                .filter(ur -> ur.isEffectiveOn(LocalDate.now()))
                .filter(ur -> ur.getRole().getName() == Role.RoleName.EMPLOYEE)
                .map(ur -> ur.getCompany() != null ? ur.getCompany().getId() : null)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Selected user has no active employment company"));
        if (!employmentCompanyId.equals(request.getCompanyId())) {
            throw new BadRequestException("This role must be assigned in the employee's employment company");
        }
    }

    private Set<String> currentAuthorities() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .map(a -> a.getAuthority()).collect(Collectors.toSet());
    }

    private void requireSuperAdmin() {
        Set<String> roles = currentAuthorities();
        if (!roles.contains("ROLE_SUPER_ADMIN") && !roles.contains("ROLE_PLATFORM_SUPER_ADMIN"))
            throw new BadRequestException("Only Super Admin may perform this action");
    }

    private void requireCompanyAccess(Long companyId) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope != null && !scope.hasUnrestrictedAccess() && !scope.canAccess(companyId))
            throw new BadRequestException("Company is outside your authorized scope");
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
            Long employmentCompanyId = userRoleRepository.findByUserId(u.getId()).stream()
                    .filter(ur -> ur.isEffectiveOn(LocalDate.now()))
                    .filter(ur -> ur.getRole().getName() == Role.RoleName.EMPLOYEE)
                    .map(ur -> ur.getCompany() != null ? ur.getCompany().getId() : null)
                    .filter(java.util.Objects::nonNull)
                    .findFirst().orElse(null);
            map.put("companyId", employmentCompanyId);
            return map;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> effectiveAccess(Long assignmentId) {
        UserRole assignment = userRoleRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Role assignment", assignmentId));
        AccessScopeContext.ScopeData caller = AccessScopeContext.get();
        if (caller != null && !caller.hasUnrestrictedAccess()
                && (assignment.getCompany() == null || !caller.canAccess(assignment.getCompany().getId())))
            throw new BadRequestException("Assignment is outside your authorized scope");
        List<String> permissions = assignment.getRole().getPermissions().stream()
                .map(p -> p.getName()).sorted().toList();
        List<String> modules = assignment.getRole().getPermissions().stream()
                .map(p -> p.getModule()).filter(java.util.Objects::nonNull).distinct().sorted().toList();
        return Map.ofEntries(
                Map.entry("assignmentId", assignment.getId()),
                Map.entry("role", assignment.getRole().getName().name()),
                Map.entry("roleDisplayName", assignment.getRole().getDisplayName()),
                Map.entry("companyId", assignment.getCompany().getId()),
                Map.entry("companyName", assignment.getCompany().getName()),
                Map.entry("scope", assignment.getAccessScope().name()),
                Map.entry("scopeSummary", assignment.getRole().getName() == Role.RoleName.ACCOUNT_MANAGER
                        ? "All current and future branches" : assignment.getAccessScope().name().replace('_', ' ')),
                Map.entry("modules", modules), Map.entry("permissions", permissions),
                Map.entry("effectiveFrom", assignment.getEffectiveFrom()),
                Map.entry("expiresOn", assignment.getExpiresOn() == null ? "" : assignment.getExpiresOn()),
                Map.entry("status", assignment.getAssignmentStatus().name()),
                Map.entry("grantReason", assignment.getAssignmentReason() == null ? "" : assignment.getAssignmentReason())
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> migrationDryRun() {
        requireSuperAdmin();
        return userRoleRepository.findAll().stream().map(assignment -> {
            Role.RoleName current = assignment.getRole().getName();
            Role.RoleName proposed = switch (current) {
                case PLATFORM_SUPER_ADMIN -> Role.RoleName.SUPER_ADMIN;
                case ENTERPRISE_ADMIN -> (assignment.getAccessScope() == UserRole.AccessScope.ENTERPRISE
                        || assignment.getAccessScope() == UserRole.AccessScope.HEAD_OFFICE)
                        ? Role.RoleName.COMPANY_ADMIN : null;
                case ACCOUNTANT -> Role.RoleName.ACCOUNTS_MANAGER;
                case TEAM_LEAD -> Role.RoleName.DEPARTMENT_MANAGER;
                case HR_MANAGER, DEPARTMENT_MANAGER, EMPLOYEE -> current;
                default -> null;
            };
            Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("assignmentId", assignment.getId());
            row.put("userId", assignment.getUser().getId());
            row.put("username", assignment.getUser().getUsername());
            row.put("companyId", assignment.getCompany() != null ? assignment.getCompany().getId() : null);
            row.put("currentRole", current.name());
            row.put("proposedRole", proposed != null ? proposed.name() : null);
            row.put("scope", assignment.getAccessScope());
            row.put("resolution", proposed != null ? "SAFE_COMPATIBLE_MAPPING" : "REVIEW_REQUIRED_RETAIN_RESTRICTED");
            row.put("applied", false);
            return row;
        }).toList();
    }
}
