package com.example.demo.auth.security;

import com.example.demo.auth.entity.Permission;
import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.time.LocalDate;

/**
 * Spring Security's representation of an authenticated user.
 *
 * Authorities loaded here are used by @PreAuthorize checks:
 *   hasRole('BRANCH_ADMIN')      → checks for "ROLE_BRANCH_ADMIN" authority
 *   hasAuthority('leave:approve') → checks for "leave:approve" authority
 *
 * Note: This loads all roles from all companies the user belongs to.
 * Fine-grained data filtering (which company's data they can see) is handled
 * separately by AccessScopeInterceptor at request time.
 */
@Getter
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String username;
    private final String email;
    private final String password;
    private final boolean active;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(User user) {
        this(user, List.of());
    }

    /**
     * Constructor used for PLATFORM_SUPER_ADMIN — passes all system permissions
     * so that every hasAuthority() check passes automatically.
     */
    public UserPrincipal(User user, List<Permission> allPermissions) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.password = user.getPassword();
        this.active = user.isActive();

        List<GrantedAuthority> auths = new ArrayList<>();

        // Role assignments are the single source of truth for authorization.
        // A current PLATFORM_SUPER_ADMIN assignment grants platform-wide access;
        // SUPER_ADMIN remains scoped to the companies assigned to that user.
        // The legacy users.is_superuser flag must not override a revoked, expired,
        // or missing role assignment.
        List<UserRole> effectiveAssignments = user.getUserRoles().stream()
                .filter(ur -> ur.isEffectiveOn(LocalDate.now()))
                .toList();
        auths.addAll(authoritiesForAssignments(effectiveAssignments));

        if (hasEffectivePlatformSuperAdminRole(effectiveAssignments)) {
            allPermissions.forEach(p ->
                    auths.add(new SimpleGrantedAuthority(p.getName())));
        }

        // Remove duplicates (a user might have the same role in multiple companies)
        this.authorities = auths.stream().distinct().collect(Collectors.toList());
    }

    public static List<GrantedAuthority> authoritiesForAssignments(Collection<UserRole> assignments) {
        List<GrantedAuthority> result = new ArrayList<>();
        assignments.forEach(ur -> {
            Role.RoleName roleName = ur.getRole().getName();
            boolean payrollExcluded = roleName == Role.RoleName.ACCOUNT_MANAGER
                    && ur.getAccessLevel() == UserRole.AccessLevel.PARTIAL;
            result.add(new SimpleGrantedAuthority("ROLE_" + roleName.name()));
            compatibilityAuthorities(roleName).forEach(alias ->
                    result.add(new SimpleGrantedAuthority("ROLE_" + alias.name())));
            ur.getRole().getPermissions().stream()
                    .map(Permission::getName)
                    .filter(permission -> !payrollExcluded || !permission.startsWith("payroll:"))
                    .forEach(permission -> result.add(new SimpleGrantedAuthority(permission)));
            roleBaselinePermissions(roleName).stream()
                    .filter(permission -> !payrollExcluded || !permission.startsWith("payroll:"))
                    .forEach(permission -> result.add(new SimpleGrantedAuthority(permission)));
        });
        return result.stream().distinct().collect(Collectors.toList());
    }

    /** True only when the user has a current, active Platform Super Admin assignment. */
    public static boolean hasEffectivePlatformSuperAdminRole(User user) {
        return hasEffectivePlatformSuperAdminRole(user.getUserRoles().stream()
                .filter(ur -> ur.isEffectiveOn(LocalDate.now()))
                .toList());
    }

    private static boolean hasEffectivePlatformSuperAdminRole(Collection<UserRole> assignments) {
        return assignments.stream().anyMatch(ur ->
                ur.getRole().getName() == Role.RoleName.PLATFORM_SUPER_ADMIN);
    }

    private static Set<String> roleBaselinePermissions(Role.RoleName roleName) {
        return switch (roleName) {
            case SUPER_ADMIN, PLATFORM_SUPER_ADMIN, ACCOUNT_MANAGER, COMPANY_ADMIN, CEO, ENTERPRISE_ADMIN -> Set.of(
                    "payroll:view", "payroll:create", "payroll:edit", "payroll:approve");
            case COMPANY_MANAGER, BRANCH_ADMIN -> Set.of(
                    "payroll:view", "payroll:create", "payroll:edit");
            case ACCOUNTS_MANAGER, ACCOUNTANT -> Set.of(
                    "payroll:view", "payroll:create", "payroll:edit", "payroll:approve");
            case EMPLOYEE -> Set.of(
                    "leave:view", "leave:create", "payroll:view");
            default -> Set.of();
        };
    }

    /** Temporary endpoint compatibility while controllers move from legacy names. */
    private static Set<Role.RoleName> compatibilityAuthorities(Role.RoleName roleName) {
        return switch (roleName) {
            // SUPER_ADMIN is company-scoped. PLATFORM_SUPER_ADMIN is granted only
            // by its own active role assignment.
            case SUPER_ADMIN -> Set.of(Role.RoleName.ENTERPRISE_ADMIN);
            // CEO is a business title with the same company-wide capability as an
            // Enterprise Admin.  The assignment's company scope is still enforced
            // by AccessScopeInterceptor, so this never grants cross-company access.
            case ACCOUNT_MANAGER, COMPANY_ADMIN, CEO -> Set.of(Role.RoleName.ENTERPRISE_ADMIN);
            case COMPANY_MANAGER -> Set.of(Role.RoleName.BRANCH_ADMIN);
            case ACCOUNTS_MANAGER -> Set.of(Role.RoleName.ACCOUNTANT);
            default -> Set.of();
        };
    }

    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return active; }
}
