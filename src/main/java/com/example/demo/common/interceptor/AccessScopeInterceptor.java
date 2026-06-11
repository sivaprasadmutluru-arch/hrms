package com.example.demo.common.interceptor;

import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.CrossBranchAccessGrantRepository;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.context.CompanyContext;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.employee.repository.EmployeeRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.ArrayList;
import java.util.List;

/**
 * Runs on every API request after JWT authentication.
 *
 * What it does:
 * 1. Reads the X-Company-Id header to know which company context the user is operating in.
 * 2. Looks up the user's role and access scope for that company.
 * 3. Builds the list of company IDs the user is allowed to query:
 *    - HEAD_OFFICE / ENTERPRISE scope → Head Office + all its branch IDs
 *    - BRANCH scope                   → only that branch
 *    - SELF / DEPARTMENT scope        → only their own company
 *    - PLATFORM_SUPER_ADMIN           → unrestricted (empty list = no filter)
 * 4. Stores this in AccessScopeContext (thread-local) for service layer use.
 * 5. Also sets the legacy CompanyContext for backward compatibility.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AccessScopeInterceptor implements HandlerInterceptor {

    private final UserRoleRepository userRoleRepository;
    private final CompanyRepository companyRepository;
    private final CrossBranchAccessGrantRepository crossBranchGrantRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {

        // Step 1: Get the company ID from the request header
        Long companyId = parseCompanyId(request.getHeader("X-Company-Id"));

        // Step 2: Get the authenticated user
        UserPrincipal currentUser = getAuthenticatedUser();

        if (currentUser == null || companyId == null) {
            // No user or no company context — allow the request to proceed
            // Security is still enforced by @PreAuthorize annotations
            return true;
        }

        // Step 2b: Block access if the user's organization is suspended (Platform Super Admin is exempt)
        boolean isPlatformAdmin = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_PLATFORM_SUPER_ADMIN"));
        if (!isPlatformAdmin) {
            Organization.OrgStatus orgStatus = companyRepository.findOrgStatusByCompanyId(companyId).orElse(null);
            if (Organization.OrgStatus.SUSPENDED.equals(orgStatus)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                try {
                    response.getWriter().write("{\"status\":403,\"message\":\"ORGANIZATION_SUSPENDED\"}");
                } catch (java.io.IOException e) {
                    log.error("Failed to write suspension response", e);
                }
                return false;
            }
        }

        // Step 3: Set legacy CompanyContext for backward compatibility
        CompanyContext.set(companyId);

        // Step 4: Find the user's role assignment for this company
        List<UserRole> userRoles = new ArrayList<>(userRoleRepository.findByUserIdAndCompanyId(currentUser.getId(), companyId));
        boolean isBranchFilter = false;

        // If the requested company is a branch, also merge any roles the user has on the parent
        // head office. This handles the case where a branch employee is elevated to ENTERPRISE_ADMIN:
        // the enterprise role is stored at the HO level, but the user still has a branch-level
        // EMPLOYEE role — without this merge, the interceptor would find EMPLOYEE first and skip
        // the HO lookup entirely (since userRoles is not empty), causing enterprise access to be lost.
        Company requestedCompany = companyRepository.findById(companyId).orElse(null);
        if (requestedCompany != null && requestedCompany.isBranch()
                && requestedCompany.getParentCompanyId() != null) {
            List<UserRole> hoRoles = userRoleRepository.findByUserIdAndCompanyId(
                    currentUser.getId(), requestedCompany.getParentCompanyId());
            if (!hoRoles.isEmpty()) {
                if (userRoles.isEmpty()) {
                    userRoles = new ArrayList<>(hoRoles);
                    log.debug("User {} has no direct role for branch {} — falling back to head-office roles ({})",
                            currentUser.getId(), companyId, requestedCompany.getParentCompanyId());
                } else {
                    // Merge HO roles into branch roles so the highest scope wins
                    userRoles.addAll(hoRoles);
                    log.debug("User {} has both branch and HO roles — merging for highest-scope resolution (branch={}, HO={})",
                            currentUser.getId(), companyId, requestedCompany.getParentCompanyId());
                }
                isBranchFilter = true;
            }
        }

        // Step 5: Determine access scope (use the highest scope if user has multiple roles)
        UserRole.AccessScope scope = resolveHighestScope(userRoles, currentUser);

        // Step 6: Build the list of company IDs this user can access.
        // For ENTERPRISE/HEAD_OFFICE scope, always expand to the full company tree regardless
        // of whether the request came via a branch X-Company-Id (isBranchFilter path).
        // Explicit branch filtering is handled at the query level via the filterByCompanyId
        // request parameter — not by restricting the scope here.
        List<Long> accessibleCompanyIds;
        if (isBranchFilter
                && (scope == UserRole.AccessScope.ENTERPRISE || scope == UserRole.AccessScope.HEAD_OFFICE)) {
            // Resolve from the head office so the full enterprise tree is accessible
            // (requestedCompany already resolved above in Step 4)
            Long rootCompanyId = (requestedCompany != null && requestedCompany.isBranch()
                    && requestedCompany.getParentCompanyId() != null)
                    ? requestedCompany.getParentCompanyId()
                    : companyId;
            accessibleCompanyIds = buildAccessibleCompanyIds(rootCompanyId, scope);
            log.debug("Enterprise admin {} via branch {} — expanding to full enterprise from HO {}",
                    currentUser.getId(), companyId, rootCompanyId);
        } else {
            accessibleCompanyIds = buildAccessibleCompanyIds(companyId, scope);
        }

        // Step 6b: Also add any companies explicitly granted via cross-branch access
        if (scope != null) { // not platform admin (they already have unrestricted)
            List<Long> granted = crossBranchGrantRepository.findGrantedCompanyIdsByUserId(currentUser.getId());
            for (Long grantedId : granted) {
                if (!accessibleCompanyIds.contains(grantedId)) {
                    if (accessibleCompanyIds instanceof java.util.ArrayList) {
                        accessibleCompanyIds.add(grantedId);
                    } else {
                        accessibleCompanyIds = new ArrayList<>(accessibleCompanyIds);
                        accessibleCompanyIds.add(grantedId);
                    }
                }
            }
        }

        // Step 7: Resolve tenant schema and set TenantContext FIRST
        // (must happen before any employee repository lookups — they run in the tenant schema)
        String tenantSchema = resolveTenantSchema(companyId);
        TenantContext.setTenant(tenantSchema);

        // Step 8: Resolve departmentId for DEPARTMENT scope (used by ScopeFilter.byEmployeeDepartment)
        // NOTE: This must run AFTER TenantContext is set, otherwise the query hits the wrong schema.
        Long departmentId = null;
        if (scope == UserRole.AccessScope.DEPARTMENT) {
            departmentId = employeeRepository.findByUserId(currentUser.getId())
                    .map(e -> e.getDepartment() != null ? e.getDepartment().getId() : null)
                    .orElse(null);
        }

        // Step 9: Store in thread-local context for services to use
        AccessScopeContext.set(new AccessScopeContext.ScopeData(
                currentUser.getId(), companyId, scope, accessibleCompanyIds, departmentId));

        log.debug("User {} | Company {} | Scope {} | Accessible companies: {} | Tenant schema: {}",
                currentUser.getId(), companyId, scope, accessibleCompanyIds, tenantSchema);

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler, Exception ex) {
        // Always clean up thread-local storage to prevent memory leaks
        AccessScopeContext.clear();
        CompanyContext.clear();
        TenantContext.clear();
    }

    // --- Private helpers ---

    /**
     * Determines the highest access scope from the user's role assignments.
     * Platform Super Admin always gets unrestricted access regardless of company.
     */
    private UserRole.AccessScope resolveHighestScope(List<UserRole> userRoles, UserPrincipal currentUser) {
        // Platform Super Admin bypasses all scope restrictions
        boolean isPlatformAdmin = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_PLATFORM_SUPER_ADMIN"));
        if (isPlatformAdmin) {
            return null; // null = unrestricted
        }

        if (userRoles.isEmpty()) {
            return UserRole.AccessScope.SELF; // Default to most restrictive
        }

        // Priority order: ENTERPRISE > HEAD_OFFICE > BRANCH > DEPARTMENT > SELF
        UserRole.AccessScope highest = UserRole.AccessScope.SELF;
        for (UserRole ur : userRoles) {
            if (ur.getAccessScope() == null) continue;
            if (scopePriority(ur.getAccessScope()) > scopePriority(highest)) {
                highest = ur.getAccessScope();
            }
        }
        return highest;
    }

    /**
     * Builds the list of company IDs the user can query based on their scope.
     *
     * ENTERPRISE or HEAD_OFFICE → Head Office ID + all active branch IDs
     * BRANCH, DEPARTMENT, SELF  → only their own company ID
     * null (Platform Admin)     → empty list = no restriction
     */
    private List<Long> buildAccessibleCompanyIds(Long companyId, UserRole.AccessScope scope) {
        if (scope == null) {
            return new ArrayList<>(); // Platform Admin — no restriction
        }

        if (scope == UserRole.AccessScope.ENTERPRISE || scope == UserRole.AccessScope.HEAD_OFFICE) {
            Company company = companyRepository.findById(companyId).orElse(null);
            log.info("[Scope] companyId={} type={} isHeadOffice={} scope={}",
                    companyId,
                    company != null ? company.getCompanyType() : "NOT_FOUND",
                    company != null && company.isHeadOffice(),
                    scope);

            if (company == null) return List.of(companyId);

            if (company.isHeadOffice()) {
                List<Long> branchIds = companyRepository.findBranchIdsByHeadOfficeId(companyId);
                List<Long> ids = new ArrayList<>();
                ids.add(companyId);
                ids.addAll(branchIds);
                log.info("[Scope] HEAD_OFFICE {} branches from DB: {} → accessible: {}", companyId, branchIds, ids);
                return ids;
            } else if (company.isBranch() && company.getParentCompany() != null) {
                Long headOfficeId = company.getParentCompany().getId();
                List<Long> branchIds = companyRepository.findBranchIdsByHeadOfficeId(headOfficeId);
                List<Long> ids = new ArrayList<>();
                ids.add(headOfficeId);
                ids.addAll(branchIds);
                log.info("[Scope] BRANCH {} → headOffice={} branches: {} → accessible: {}", companyId, headOfficeId, branchIds, ids);
                return ids;
            } else {
                log.warn("[Scope] companyId={} has ENTERPRISE/HO scope but is neither HEAD_OFFICE nor BRANCH with parent — defaulting to self", companyId);
            }
        }

        // BRANCH, DEPARTMENT, SELF → only their own company
        return List.of(companyId);
    }

    private int scopePriority(UserRole.AccessScope scope) {
        return switch (scope) {
            case SELF -> 1;
            case DEPARTMENT -> 2;
            case BRANCH -> 3;
            case HEAD_OFFICE -> 4;
            case ENTERPRISE -> 5;
        };
    }

    private UserPrincipal getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal) {
            return (UserPrincipal) auth.getPrincipal();
        }
        return null;
    }

    private Long parseCompanyId(String header) {
        if (header == null) return null;
        try {
            return Long.parseLong(header);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Resolves the PostgreSQL schema name for the given company ID.
     * HEAD_OFFICE → its own schemaName
     * BRANCH      → its parent Head Office's schemaName
     * Fallback    → TenantContext.DEFAULT_TENANT ("public")
     */
    private String resolveTenantSchema(Long companyId) {
        if (companyId == null) return TenantContext.DEFAULT_TENANT;
        return companyRepository.findById(companyId)
                .map(company -> {
                    if (company.isHeadOffice()) {
                        return company.getSchemaName();
                    }
                    // Branch — get parent Head Office's schema using parentCompanyId (non-lazy)
                    return companyRepository.findById(company.getParentCompanyId())
                            .map(Company::getSchemaName)
                            .orElse(null);
                })
                .filter(s -> s != null && !s.isBlank())
                .orElse(TenantContext.DEFAULT_TENANT);
    }
}
