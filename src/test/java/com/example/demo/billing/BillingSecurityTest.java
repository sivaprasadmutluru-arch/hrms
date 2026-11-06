package com.example.demo.billing;
import com.example.demo.auth.entity.*;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.entity.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class BillingSecurityTest {
    UserRoleRepository roles=mock(UserRoleRepository.class); BillingSecurity security=new BillingSecurity(roles,new com.example.demo.platformops.PlatformTeamAccess(mock(org.springframework.jdbc.core.JdbcTemplate.class)));
    void login(String role) {
        UserPrincipal user=mock(UserPrincipal.class); when(user.getId()).thenReturn(1L);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user,null,List.of(new SimpleGrantedAuthority("ROLE_"+role))));
    }
    UserRole assignment(long orgId) {
        var org=new Organization(); org.setId(orgId); var company=new Company(); company.setOrganization(org);
        var role=new Role(); role.setName(Role.RoleName.ENTERPRISE_ADMIN); var assignment=new UserRole(); assignment.setRole(role);
        assignment.setCompany(company); assignment.setAccessScope(UserRole.AccessScope.ENTERPRISE); return assignment;
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void platformAdminCanManageBillingAcrossOrganizations() {
        login("PLATFORM_SUPER_ADMIN"); assertThatCode(() -> security.require(2L)).doesNotThrowAnyException(); verifyNoInteractions(roles);
    }
    @Test void ownerCanManageOnlyOwnOrganization() {
        login("ENTERPRISE_ADMIN"); when(roles.findByUserId(1L)).thenReturn(List.of(assignment(2)));
        assertThatCode(() -> security.require(2L)).doesNotThrowAnyException();
        assertThatThrownBy(() -> security.require(3L)).isInstanceOf(BillingFailure.class);
    }
    @Test void revokedAndBranchScopedAssignmentsCannotManageBilling() {
        login("ENTERPRISE_ADMIN"); var role=assignment(2); role.setAssignmentStatus(UserRole.AssignmentStatus.REVOKED);
        when(roles.findByUserId(1L)).thenReturn(List.of(role));
        assertThatThrownBy(() -> security.require(2L)).isInstanceOf(BillingFailure.class);
        role.setAssignmentStatus(UserRole.AssignmentStatus.ACTIVE); role.setAccessScope(UserRole.AccessScope.BRANCH);
        assertThatThrownBy(() -> security.require(2L)).isInstanceOf(BillingFailure.class);
    }
    @Test void unauthenticatedRequestCannotAccessBilling() { assertThatThrownBy(() -> security.require(2L)).isInstanceOf(BillingFailure.class); }
}
