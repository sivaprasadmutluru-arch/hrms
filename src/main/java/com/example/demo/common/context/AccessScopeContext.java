package com.example.demo.common.context;

import com.example.demo.auth.entity.UserRole;

import java.util.Collections;
import java.util.List;

/**
 * Thread-local storage for the current request's security scope.
 *
 * Populated by AccessScopeInterceptor on every request after JWT authentication.
 * Cleared after the request completes.
 *
 * Usage in services:
 *   AccessScopeContext.ScopeData scope = AccessScopeContext.get();
 *   List<Long> companyIds = scope.getAccessibleCompanyIds(); // query these companies
 */
public class AccessScopeContext {

    private static final ThreadLocal<ScopeData> HOLDER = new ThreadLocal<>();

    private AccessScopeContext() {}

    public static void set(ScopeData data) {
        HOLDER.set(data);
    }

    public static ScopeData get() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }

    /**
     * Contains everything a service needs to know about the current user's access rights.
     *
     * accessibleCompanyIds: the list of company IDs this user is allowed to query.
     *   - EMPLOYEE / BRANCH scope    → [their own companyId]
     *   - HEAD_OFFICE / ENTERPRISE   → [headOfficeId, branchId1, branchId2, ...]
     *   - PLATFORM_SUPER_ADMIN       → empty = no restriction (queries all)
     */
    public static class ScopeData {

        private final Long userId;
        private final Long companyId;           // The company they logged into (from X-Company-Id header)
        private final UserRole.AccessScope scope;
        private final List<Long> accessibleCompanyIds;
        // Populated for DEPARTMENT scope: the department ID of the current user's employee record
        private final Long departmentId;

        public ScopeData(Long userId, Long companyId, UserRole.AccessScope scope, List<Long> accessibleCompanyIds) {
            this(userId, companyId, scope, accessibleCompanyIds, null);
        }

        public ScopeData(Long userId, Long companyId, UserRole.AccessScope scope,
                         List<Long> accessibleCompanyIds, Long departmentId) {
            this.userId = userId;
            this.companyId = companyId;
            this.scope = scope;
            this.accessibleCompanyIds = accessibleCompanyIds != null
                    ? Collections.unmodifiableList(accessibleCompanyIds)
                    : Collections.emptyList();
            this.departmentId = departmentId;
        }

        public Long getUserId() { return userId; }
        public Long getCompanyId() { return companyId; }
        public UserRole.AccessScope getScope() { return scope; }
        public List<Long> getAccessibleCompanyIds() { return accessibleCompanyIds; }
        public Long getDepartmentId() { return departmentId; }

        // True when the user has no company restriction (Platform Super Admin)
        public boolean hasUnrestrictedAccess() {
            return accessibleCompanyIds.isEmpty();
        }

        // True when the user is operating in SELF scope (employee sees only own data)
        public boolean isSelfScope() {
            return scope == UserRole.AccessScope.SELF;
        }

        // True when the user can access data from a specific company
        public boolean canAccess(Long targetCompanyId) {
            if (hasUnrestrictedAccess()) return true;
            return accessibleCompanyIds.contains(targetCompanyId);
        }
    }
}
