package com.example.demo.common.util;

import com.example.demo.common.context.AccessScopeContext;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

/**
 * Utility for building JPA Specifications based on the current user's access scope.
 *
 * Usage in any service:
 *   Specification<Employee> spec = ScopeFilter.byCompany();
 *   return repo.findAll(spec, pageable);
 *
 * How it works:
 *   - ENTERPRISE / HEAD_OFFICE scope  → WHERE company_id IN (1, 2, 3, 4, 5)
 *   - BRANCH / DEPARTMENT / SELF scope → WHERE company_id IN (3)
 *   - PLATFORM_SUPER_ADMIN (unrestricted) → no WHERE clause (sees everything)
 *   - No context set (unauthenticated)   → no WHERE clause (controller @PreAuthorize handles auth)
 */
public final class ScopeFilter {

    private ScopeFilter() {}

    /**
     * Returns a Specification that filters records by the companies
     * the current user is allowed to access.
     *
     * The entity must have a field named "company" with an "id" sub-field.
     * Works for: Employee, Attendance, LeaveRequest, Payslip, Contract, etc.
     */
    public static <T> Specification<T> byCompany() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();

        // No scope context (e.g. public endpoint) — no filter applied
        if (scope == null) {
            return null;
        }

        // Platform Super Admin: if a specific company context was provided via X-Company-Id, filter by it.
        // Otherwise unrestricted (no filter).
        if (scope.hasUnrestrictedAccess()) {
            if (scope.getCompanyId() != null) {
                Long companyId = scope.getCompanyId();
                return (root, query, cb) -> cb.equal(root.get("company").get("id"), companyId);
            }
            return null;
        }

        List<Long> accessibleIds = scope.getAccessibleCompanyIds();

        // Safety check: if accessible list is somehow empty, return nothing
        if (accessibleIds.isEmpty()) {
            return (root, query, cb) -> cb.disjunction(); // always false → empty result
        }

        // Single company (branch/dept/self scope) — use equals, not IN, for performance
        if (accessibleIds.size() == 1) {
            Long companyId = accessibleIds.get(0);
            return (root, query, cb) -> cb.equal(root.get("company").get("id"), companyId);
        }

        // Multiple companies (enterprise/head office scope)
        return (root, query, cb) -> root.get("company").get("id").in(accessibleIds);
    }

    /**
     * Convenience: applies the spec if non-null, or returns all.
     * Use this when calling repo.findAll() to avoid null spec issues.
     */
    public static <T> Specification<T> byCompanyOrAll() {
        Specification<T> spec = byCompany();
        return spec != null ? spec : Specification.where(null);
    }

    /**
     * For entities with an "employee" → "user" → "id" path (LeaveRequest, Attendance, Payslip).
     *   SELF scope       → WHERE employee.user.id = :userId  (employee sees only their own records)
     *   All other scopes → delegate to byCompany()
     */
    public static <T> Specification<T> byEmployee() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null) return null;
        if (scope.hasUnrestrictedAccess()) return byCompany(); // delegates to company-context filter for platform admin
        if (scope.isSelfScope()) {
            Long userId = scope.getUserId();
            return (root, query, cb) -> cb.equal(root.get("employee").get("user").get("id"), userId);
        }
        return byCompany();
    }

    /**
     * For entities where company is reached THROUGH the "employee" relation
     * (AttendanceLateComeEarlyOut, AttendanceOverTime — path: entity.employee.company.id).
     *
     *   SELF scope       → WHERE employee.user.id = :userId
     *   All other scopes → WHERE employee.company.id IN (...)
     */
    public static <T> Specification<T> byEmployeeCompany() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null) return null;

        if (scope.isSelfScope()) {
            Long userId = scope.getUserId();
            return (root, query, cb) -> cb.equal(root.get("employee").get("user").get("id"), userId);
        }

        if (scope.hasUnrestrictedAccess()) {
            if (scope.getCompanyId() != null) {
                Long companyId = scope.getCompanyId();
                return (root, query, cb) -> cb.equal(root.get("employee").get("company").get("id"), companyId);
            }
            return null;
        }

        List<Long> accessibleIds = scope.getAccessibleCompanyIds();
        if (accessibleIds.isEmpty()) {
            return (root, query, cb) -> cb.disjunction();
        }
        if (accessibleIds.size() == 1) {
            Long companyId = accessibleIds.get(0);
            return (root, query, cb) -> cb.equal(root.get("employee").get("company").get("id"), companyId);
        }
        return (root, query, cb) -> root.get("employee").get("company").get("id").in(accessibleIds);
    }

    /**
     * For entities where department is reached THROUGH the "employee" relation
     * (LeaveRequest, Attendance — path: entity.employee.department.id).
     *
     *   SELF scope       → WHERE employee.user.id = :userId
     *   DEPARTMENT scope → WHERE employee.department.id = :departmentId
     *   All other scopes → delegate to byCompany()
     *
     * Use this in LeaveService and AttendanceService.
     * Use byDepartmentOrCompany() for Employee itself (direct department.id path).
     */
    public static <T> Specification<T> byEmployeeDepartment() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null) return null;
        if (scope.hasUnrestrictedAccess()) return byCompany(); // delegates to company-context filter for platform admin
        if (scope.isSelfScope()) {
            Long userId = scope.getUserId();
            return (root, query, cb) -> cb.equal(root.get("employee").get("user").get("id"), userId);
        }
        if (scope.getScope() == com.example.demo.auth.entity.UserRole.AccessScope.DEPARTMENT
                && scope.getDepartmentId() != null) {
            Long deptId = scope.getDepartmentId();
            return (root, query, cb) -> cb.equal(root.get("employee").get("department").get("id"), deptId);
        }
        return byCompany();
    }

    /**
     * For entities directly representing employees or linked to a department.
     *   SELF scope       → handled upstream (caller should short-circuit before calling this)
     *   DEPARTMENT scope → WHERE department.id = :departmentId
     *   All other scopes → delegate to byCompany()
     */
    public static <T> Specification<T> byDepartmentOrCompany() {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null) return null;
        if (scope.hasUnrestrictedAccess()) return byCompany(); // delegates to company-context filter for platform admin
        if (scope.getScope() == com.example.demo.auth.entity.UserRole.AccessScope.DEPARTMENT
                && scope.getDepartmentId() != null) {
            Long deptId = scope.getDepartmentId();
            return (root, query, cb) -> cb.equal(root.get("department").get("id"), deptId);
        }
        return byCompany();
    }
}
