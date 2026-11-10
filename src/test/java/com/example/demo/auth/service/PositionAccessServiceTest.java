package com.example.demo.auth.service;
import com.example.demo.auth.entity.*;
import com.example.demo.auth.repository.*;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class PositionAccessServiceTest {
    JdbcTemplate jdbc=mock(JdbcTemplate.class);
    CompanyRepository companies=mock(CompanyRepository.class);
    RoleRepository roles=mock(RoleRepository.class);
    UserRoleRepository assignments=mock(UserRoleRepository.class);
    PositionAccessService service=new PositionAccessService(jdbc,companies,roles,assignments);
    Company root=company(2L,null), branch=company(3L,2L), other=company(4L,2L);
    User user=new User();
    PositionAccessServiceTest() {
        root.setSchemaName("test_org"); user.setId(9L); user.setUsername("employee"); user.setPassword("hash"); user.setEmail("test@example.invalid");
        when(companies.findById(2L)).thenReturn(Optional.of(root)); when(companies.findById(3L)).thenReturn(Optional.of(branch)); when(companies.findById(4L)).thenReturn(Optional.of(other));
        user.setUserRoles(new ArrayList<>(List.of(assignment(Role.RoleName.EMPLOYEE,branch,UserRole.AccessScope.SELF))));
    }
    static Company company(Long id,Long parent) { var c=new Company(); c.setId(id); c.setParentCompanyId(parent); c.setCompanyType(parent==null?Company.CompanyType.HEAD_OFFICE:Company.CompanyType.BRANCH); return c; }
    static Role role(Role.RoleName name,String... permissions) { var r=new Role(); r.setName(name); for(String nameValue:permissions) { var p=new Permission();p.setName(nameValue);r.getPermissions().add(p); }return r; }
    UserRole assignment(Role.RoleName role,Company company,UserRole.AccessScope scope) { var a=new UserRole();a.setRole(role(role));a.setCompany(company);a.setAccessScope(scope);a.setUser(user);return a; }
    PositionAccessService.Grant grant(PositionAccessService.Profile p) { return new PositionAccessService.Grant(3L,2L,5L,10L,"Title",p,role(p.role,"employee:view","leave:approve")); }
    List<String> authorities(List<UserRole> explicit,PositionAccessService.Grant... grants) { return PositionAccessService.authorities(explicit,List.of(grants)).stream().map(a -> a.getAuthority()).toList(); }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void noMembershipAndRevokedMembershipCannotProducePositionGrants() {
        user.getUserRoles().getFirst().setExpiresOn(LocalDate.now().minusDays(1));
        assertThat(service.resolve(user)).isEmpty(); verifyNoInteractions(jdbc);
        user.setUserRoles(List.of()); assertThat(service.resolve(user)).isEmpty();
    }
    @Test void positionLookupRequiresActiveEmploymentPositionCompanyAndExplicitMembership() {
        when(jdbc.queryForList(anyString(),eq(9L),eq(2L),eq(2L))).thenAnswer(invocation -> {
            String sql=invocation.getArgument(0); assertThat(sql).contains("e.is_active=true","jp.is_active=true","c.is_active=true","jp.company_id=e.company_id","public.job_position_access");
            return List.of(Map.of("employee_id",5L,"company_id",3L,"position_id",10L,"name","CEO","profile","CEO"));
        });
        var role=role(Role.RoleName.CEO,"employee:view","organization:create","platform:manage"); when(roles.findByName(Role.RoleName.CEO)).thenReturn(Optional.of(role));
        var grants=service.resolve(user); assertThat(grants).hasSize(1); assertThat(grants.getFirst().profile()).isEqualTo(PositionAccessService.Profile.CEO);
        assertThat(grants.getFirst().role().getPermissions()).extracting(Permission::getName).containsExactly("employee:view");
        assertThat(role.getPermissions()).hasSize(3); assertThat(grants.getFirst().assignment().getCompany().getId()).isEqualTo(2L);
    }
    @Test void branchMembershipCannotActivatePositionInSiblingBranch() {
        when(jdbc.queryForList(anyString(),eq(9L),eq(2L),eq(2L))).thenReturn(List.of(Map.of("employee_id",5L,"company_id",4L,"position_id",10L,"name","CEO","profile","CEO")));
        assertThat(service.resolve(user)).isEmpty(); verifyNoInteractions(roles);
    }
    @Test void titleWithoutConfiguredPolicyGrantsNothing() {
        when(jdbc.queryForList(anyString(),eq(9L),eq(2L),eq(2L))).thenReturn(List.of());
        assertThat(service.resolve(user)).isEmpty(); verifyNoInteractions(roles);
    }
    @Test void ceoGetsBusinessAndEnterpriseRolesWithoutPlatformRole() {
        var names=authorities(user.getUserRoles(),grant(PositionAccessService.Profile.CEO));
        assertThat(names).contains("ROLE_CEO","ROLE_ENTERPRISE_ADMIN","employee:view","payroll:approve","POSITION_SECURITY_EXCLUDED").doesNotContain("ROLE_PLATFORM_SUPER_ADMIN","organization:create");
    }
    @Test void cooCannotExpandEmployeePayslipPermissionIntoOrganizationPayroll() {
        var names=authorities(user.getUserRoles(),grant(PositionAccessService.Profile.COO));
        assertThat(names).contains("ROLE_HR_MANAGER","leave:approve","POSITION_PAYROLL_EXCLUDED","POSITION_BILLING_EXCLUDED","POSITION_SECURITY_EXCLUDED","POSITION_OPERATIONS_ONLY");
        assertThat(names).noneMatch(n -> n.startsWith("payroll:")); assertThat(names).doesNotContain("ROLE_ENTERPRISE_ADMIN");
    }
    @Test void explicitFinanceAccessIsRetainedAlongsideCooPosition() {
        var finance=assignment(Role.RoleName.ACCOUNTANT,branch,UserRole.AccessScope.BRANCH);
        var names=authorities(List.of(finance),grant(PositionAccessService.Profile.COO));
        assertThat(names).contains("payroll:approve").doesNotContain("POSITION_PAYROLL_EXCLUDED");
    }
    @Test void partialAccountManagerDoesNotUnlockPositionPayroll() {
        var partial=assignment(Role.RoleName.ACCOUNT_MANAGER,branch,UserRole.AccessScope.ENTERPRISE); partial.setAccessLevel(UserRole.AccessLevel.PARTIAL);
        assertThat(authorities(List.of(partial),grant(PositionAccessService.Profile.COO))).contains("POSITION_PAYROLL_EXCLUDED");
    }
    @Test void employeeProfileIsSelfScopedAndCannotBecomeAnAdministrator() {
        var g=new PositionAccessService.Grant(3L,2L,5L,10L,"Employee",PositionAccessService.Profile.EMPLOYEE,role(Role.RoleName.EMPLOYEE));
        assertThat(g.assignment().getAccessScope()).isEqualTo(UserRole.AccessScope.SELF);
        assertThat(g.appliesTo(4L,2L)).isFalse(); assertThat(g.appliesTo(3L,2L)).isTrue();
        assertThat(authorities(List.of(),g)).doesNotContain("ROLE_ENTERPRISE_ADMIN","employee:view");
    }
    @Test void executiveGrantIsConfinedToItsOrganization() {
        var g=grant(PositionAccessService.Profile.CEO);
        assertThat(g.appliesTo(4L,2L)).isTrue(); assertThat(g.appliesTo(55L,50L)).isFalse();
    }
    @Test void derivedExecutiveCannotConfigurePolicyWithoutExplicitAdminRole() {
        var principal=new UserPrincipal(user,List.of(),List.of(grant(PositionAccessService.Profile.CEO)));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        when(assignments.findByUserId(9L)).thenReturn(user.getUserRoles());
        assertThat(service.canAdminister(3L)).isFalse();
        assertThatThrownBy(() -> service.save(3L,10L,PositionAccessService.Profile.CEO,0)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(jdbc);
    }
    @Test void executiveLoginIdentityCannotBeReassignedByHrEditor() {
        var p=new UserPrincipal(user); SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(p,null,p.getAuthorities()));
        when(assignments.findByUserId(9L)).thenReturn(user.getUserRoles());
        when(jdbc.queryForObject(anyString(),eq(Boolean.class),eq(3L),eq(10L))).thenReturn(true);
        assertThatThrownBy(() -> service.requireIdentityChange(3L,10L)).isInstanceOf(AccessDeniedException.class);
    }
    @Test void explicitCompanyAdminMayConfigureOwnTreeButNotOtherOrganizations() {
        var a=assignment(Role.RoleName.COMPANY_ADMIN,root,UserRole.AccessScope.ENTERPRISE); user.setUserRoles(List.of(a));
        var principal=new UserPrincipal(user); SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        when(assignments.findByUserId(9L)).thenReturn(List.of(a)); when(companies.findById(80L)).thenReturn(Optional.of(company(80L,null)));
        assertThat(service.canAdminister(3L)).isTrue(); assertThat(service.canAdminister(80L)).isFalse();
        a.setAssignmentStatus(UserRole.AssignmentStatus.REVOKED); assertThat(service.canAdminister(3L)).isFalse();
    }
}
