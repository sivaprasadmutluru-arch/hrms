package com.example.demo.auth.security;

import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class UserPrincipalTest {

    @Test
    void branchAdminKeepsPayrollAccessWithLegacyEmptyPermissionSet() {
        UserPrincipal principal = principalWithRole(Role.RoleName.BRANCH_ADMIN);

        assertThat(authorityNames(principal)).contains(
                "ROLE_BRANCH_ADMIN", "payroll:view", "payroll:create", "payroll:edit");
        assertThat(authorityNames(principal)).doesNotContain("payroll:approve");
    }

    @Test
    void employeeKeepsMobileLeaveAndPayslipAccessWithLegacyEmptyPermissionSet() {
        UserPrincipal principal = principalWithRole(Role.RoleName.EMPLOYEE);

        assertThat(authorityNames(principal)).contains(
                "ROLE_EMPLOYEE", "leave:view", "leave:create", "payroll:view");
    }

    @Test
    void canonicalRolesExposeLegacyAuthorityOnlyForEndpointCompatibility() {
        UserPrincipal principal = principalWithRole(Role.RoleName.ACCOUNTS_MANAGER);

        assertThat(authorityNames(principal)).contains(
                "ROLE_ACCOUNTS_MANAGER", "ROLE_ACCOUNTANT", "payroll:approve");
    }

    @Test
    void expiredAssignmentDoesNotContributeAnyAuthority() {
        User user = userWithRole(Role.RoleName.COMPANY_ADMIN);
        user.getUserRoles().getFirst().setExpiresOn(LocalDate.now().minusDays(1));

        assertThat(authorityNames(new UserPrincipal(user))).isEmpty();
    }

    @Test
    void partialAccountManagerDoesNotReceivePayrollPermissions() {
        User user = userWithRole(Role.RoleName.ACCOUNT_MANAGER);
        user.getUserRoles().getFirst().setAccessLevel(UserRole.AccessLevel.PARTIAL);

        assertThat(authorityNames(new UserPrincipal(user)))
                .contains("ROLE_ACCOUNT_MANAGER")
                .noneMatch(authority -> authority.startsWith("payroll:"));
    }

    @Test
    void companyScopedSuperAdminDoesNotBecomePlatformAdmin() {
        UserPrincipal principal = principalWithRole(Role.RoleName.SUPER_ADMIN);

        assertThat(authorityNames(principal))
                .contains("ROLE_SUPER_ADMIN", "ROLE_ENTERPRISE_ADMIN")
                .doesNotContain("ROLE_PLATFORM_SUPER_ADMIN");
    }

    private UserPrincipal principalWithRole(Role.RoleName roleName) {
        return new UserPrincipal(userWithRole(roleName));
    }

    private User userWithRole(Role.RoleName roleName) {
        User user = new User();
        user.setId(1L);
        user.setUsername("test");
        user.setEmail("test@example.com");
        user.setPassword("password");
        user.setActive(true);

        Role role = new Role();
        role.setName(roleName);

        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);
        user.setUserRoles(List.of(userRole));

        return user;
    }

    private List<String> authorityNames(UserPrincipal principal) {
        return principal.getAuthorities().stream().map(Object::toString).toList();
    }
}
