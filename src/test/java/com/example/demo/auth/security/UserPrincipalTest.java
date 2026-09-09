package com.example.demo.auth.security;

import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import org.junit.jupiter.api.Test;

import java.util.List;

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

    private UserPrincipal principalWithRole(Role.RoleName roleName) {
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

        return new UserPrincipal(user);
    }

    private List<String> authorityNames(UserPrincipal principal) {
        return principal.getAuthorities().stream().map(Object::toString).toList();
    }
}
