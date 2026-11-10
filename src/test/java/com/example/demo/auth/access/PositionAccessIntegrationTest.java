package com.example.demo.auth.access;

import com.example.demo.auth.entity.*;
import com.example.demo.auth.repository.*;
import com.example.demo.auth.security.*;
import com.example.demo.auth.service.PositionAccessService;
import com.example.demo.base.entity.*;
import com.example.demo.employee.entity.Employee;
import com.example.demo.common.context.*;
import com.example.demo.common.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @Transactional
class PositionAccessIntegrationTest {
    @Autowired EntityManager em;
    @Autowired JdbcTemplate jdbc;
    @Autowired PositionAccessService access;
    @Autowired UserDetailsServiceImpl details;
    @Autowired RoleRepository roleRepo;
    @Autowired MockMvc mvc;
    Company company,foreign; JobPosition position; Employee employee; User employeeUser,admin;
    UserRole membership;
    @BeforeEach void fixture() {
        TenantContext.clear(); CompanyContext.clear(); AccessScopeContext.clear();
        var org=new Organization();org.setName("Position integration "+UUID.randomUUID());org.setSlug("position-test-"+UUID.randomUUID());em.persist(org);
        company=new Company();company.setName("Position test "+UUID.randomUUID());company.setSchemaName("public");company.setOrganization(org);em.persist(company);
        foreign=new Company();foreign.setName("Foreign position test "+UUID.randomUUID());em.persist(foreign);
        var department=new Department();department.setName("Integration department");department.setCompany(company);em.persist(department);
        position=new JobPosition();position.setName("Integration CEO");position.setCompany(company);position.setDepartment(department);em.persist(position);
        employeeUser=createUser(); membership=assign(employeeUser,Role.RoleName.EMPLOYEE,UserRole.AccessScope.SELF);
        employee=new Employee();employee.setFirstName("Position integration employee");employee.setUser(employeeUser);employee.setCompany(company);employee.setDepartment(department);employee.setJobPosition(position);em.persist(employee);
        admin=createUser();assign(admin,Role.RoleName.COMPANY_ADMIN,UserRole.AccessScope.ENTERPRISE);em.flush();
        authenticateAdmin();
    }
    User createUser() { var u=new User();u.setUsername("position-test-"+UUID.randomUUID());u.setEmail(u.getUsername()+"@example.invalid");u.setPassword("test-fixture-not-a-login-password");em.persist(u);return u; }
    UserRole assign(User u,Role.RoleName name,UserRole.AccessScope scope) {
        Role role=roleRepo.findByName(name).orElseGet(() -> { var r=new Role();r.setName(name);em.persist(r);return r; });
        var a=new UserRole();a.setUser(u);a.setRole(role);a.setCompany(company);a.setAccessScope(scope);em.persist(a);u.getUserRoles().add(a);return a;
    }
    void authenticateAdmin() { var p=new UserPrincipal(admin);SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(p,null,p.getAuthorities())); }
    UserPrincipal employeePrincipal() { return (UserPrincipal)details.loadUserByUsername(employeeUser.getUsername()); }
    void set(PositionAccessService.Profile p,long version) { authenticateAdmin();access.save(company.getId(),position.getId(),p,version); }
    String policyPath() { return "/api/companies/"+company.getId()+"/job-positions/"+position.getId()+"/access"; }
    @AfterEach void clear() { SecurityContextHolder.clearContext();TenantContext.clear();CompanyContext.clear();AccessScopeContext.clear(); }

    @Test void policyPersistsWithAuditAndStaleVersionIsRejected() {
        assertThat(((Map<?,?>)access.get(company.getId(),position.getId()).get("policy")).get("profile")).isEqualTo("NONE");
        set(PositionAccessService.Profile.COO,0);
        assertThat(access.get(company.getId(),position.getId()).get("employeesAffected")).isEqualTo(1L);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.job_position_access_audit WHERE company_id=? AND job_position_id=?",Long.class,company.getId(),position.getId())).isEqualTo(1L);
        assertThatThrownBy(() -> access.save(company.getId(),position.getId(),PositionAccessService.Profile.CEO,0)).hasMessageContaining("changed");
    }
    @Test void cooCanUseOperationsButCannotUsePayrollReportsBillingOrSecurity() throws Exception {
        set(PositionAccessService.Profile.COO,0);var p=employeePrincipal();
        mvc.perform(get("/api/employees").header("X-Company-Id",company.getId()).with(user(p))).andExpect(status().isOk());
        for(String path:List.of("/api/payroll/contracts","/api/reports/export?type=payroll","/api/reports/payroll","/api/user-roles","/api/billing/companies/"+company.getId()))
            mvc.perform(get(path).header("X-Company-Id",company.getId()).with(user(p))).andExpect(status().isForbidden());
        var report=new com.example.demo.report.entity.GeneratedReport(); report.setCompany(company);
        report.setReportType(com.example.demo.report.entity.GeneratedReport.ReportType.PAYROLL); report.setReportName("Protected payroll report");
        report.setPeriodStart(java.time.LocalDate.now()); report.setPeriodEnd(java.time.LocalDate.now());
        report.setStatus(com.example.demo.report.entity.GeneratedReport.ReportStatus.COMPLETED); report.setFileFormat("XLSX"); report.setFilePath("must-not-read.xlsx");
        em.persist(report);em.flush();
        mvc.perform(get("/api/reports/repository/"+report.getId()+"/download").header("X-Company-Id",company.getId()).with(user(p))).andExpect(status().isForbidden());
        mvc.perform(post("/api/reports/repository/generate").header("X-Company-Id",company.getId()).with(user(p)).contentType("application/json").content("{\"reportType\":\"PAYROLL\",\"companyId\":"+company.getId()+"}")).andExpect(status().isForbidden());
        mvc.perform(get(policyPath()).header("X-Company-Id",company.getId()).with(user(p))).andExpect(status().isForbidden());
        mvc.perform(get("/api/employees").header("X-Company-Id",foreign.getId()).with(user(p))).andExpect(status().isForbidden());
    }
    @Test void ceoHasOrganizationBillingAndBusinessAccessButNoPlatformOrSecurity() throws Exception {
        set(PositionAccessService.Profile.CEO,0);var p=employeePrincipal();
        mvc.perform(get("/api/employees").header("X-Company-Id",company.getId()).with(user(p))).andExpect(status().isOk());
        mvc.perform(get("/api/billing/companies/"+company.getId()).header("X-Company-Id",company.getId()).with(user(p))).andExpect(status().isOk());
        mvc.perform(get("/api/organizations").header("X-Company-Id",company.getId()).with(user(p))).andExpect(status().isForbidden());
        mvc.perform(get("/api/user-roles").header("X-Company-Id",company.getId()).with(user(p))).andExpect(status().isForbidden());
        mvc.perform(get("/api/employees").header("X-Company-Id",foreign.getId()).with(user(p))).andExpect(status().isForbidden());
    }
    @Test void missingHeaderStillAppliesPositionCompanyAndRestrictions() throws Exception {
        set(PositionAccessService.Profile.COO,0);var p=employeePrincipal();
        mvc.perform(get("/api/auth/me").with(user(p))).andExpect(status().isOk()).andExpect(jsonPath("$.accessScope").value("ENTERPRISE")).andExpect(jsonPath("$.positionAccess[0].profile").value("COO"));
        mvc.perform(get("/api/payroll/contracts").with(user(p))).andExpect(status().isForbidden());
    }
    @Test void removingPolicyOrRevokingMembershipRemovesDerivedAccessWithoutReLogin() {
        set(PositionAccessService.Profile.CEO,0);assertThat(employeePrincipal().getPositionGrants()).hasSize(1);
        set(PositionAccessService.Profile.NONE,1);assertThat(employeePrincipal().getPositionGrants()).isEmpty();
        set(PositionAccessService.Profile.CEO,2);employee.setActive(false);em.flush();assertThat(employeePrincipal().getPositionGrants()).isEmpty();
        employee.setActive(true);membership.setAssignmentStatus(UserRole.AssignmentStatus.REVOKED);em.flush();assertThat(employeePrincipal().getPositionGrants()).isEmpty();
    }
    @Test void employeeProfileIsSelfOnlyAndOrdinaryHrCannotPromoteToPrivilegedPosition() throws Exception {
        set(PositionAccessService.Profile.EMPLOYEE,0);var p=employeePrincipal();
        mvc.perform(get("/api/auth/me").with(user(p))).andExpect(status().isOk()).andExpect(jsonPath("$.accessScope").value("SELF"));
        mvc.perform(get("/api/employees").header("X-Company-Id",company.getId()).with(user(p))).andExpect(status().isForbidden());
        var hr=createUser();assign(hr,Role.RoleName.HR_MANAGER,UserRole.AccessScope.BRANCH);em.flush();
        var principal=new UserPrincipal(hr);SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        assertThatThrownBy(() -> access.requirePositionChange(null,null,company.getId(),position.getId())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }
}
