package com.example.demo.base.service;
import com.example.demo.base.entity.*;
import com.example.demo.base.enums.OrganizationIndustry;
import com.example.demo.auth.entity.*;
import com.example.demo.auth.repository.RoleRepository;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.common.context.*;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest @Transactional
class OrganizationIndustrySetupIntegrationTest {
    @Autowired StandardCompanySetup setup;
    @Autowired OrganizationTemplateService templates;
    @Autowired EntityManager em;
    @Autowired JdbcTemplate jdbc;
    @Autowired RoleRepository roles;
    Company root,branch;Organization org;User admin;
    @BeforeEach void fixture() {
        TenantContext.clear();CompanyContext.clear();AccessScopeContext.clear();
        org=new Organization();org.setName("Industry fixture "+UUID.randomUUID());org.setSlug("industry-fixture-"+UUID.randomUUID());org.setIndustryType(OrganizationIndustry.SOFTWARE);em.persist(org);
        root=new Company();root.setName("Industry root "+UUID.randomUUID());root.setSchemaName("public");root.setOrganization(org);em.persist(root);
        branch=new Company();branch.setName("Industry branch "+UUID.randomUUID());branch.setCompanyType(Company.CompanyType.BRANCH);branch.setParentCompany(root);branch.setOrganization(org);em.persist(branch);
        admin=new User();admin.setUsername("industry-test-"+UUID.randomUUID());admin.setEmail(admin.getUsername()+"@example.invalid");admin.setPassword("fixture-only");em.persist(admin);
        var role=roles.findByName(Role.RoleName.COMPANY_ADMIN).orElseThrow();var assignment=new UserRole();assignment.setUser(admin);assignment.setCompany(root);assignment.setRole(role);assignment.setAccessScope(UserRole.AccessScope.ENTERPRISE);em.persist(assignment);admin.getUserRoles().add(assignment);em.flush();
        scope();var principal=new UserPrincipal(admin);SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
    }
    void scope() { AccessScopeContext.set(new AccessScopeContext.ScopeData(admin.getId(),root.getId(),UserRole.AccessScope.ENTERPRISE,List.of(root.getId(),branch.getId()))); }
    @SuppressWarnings("unchecked") List<Map<String,Object>> rows(Long company,String key) { return (List<Map<String,Object>>)setup.options(company).get(key); }
    Set<String> names(Long id,String key) { var names=new HashSet<String>();for(var row:rows(id,key)) names.add((String)row.get("name"));return names; }
    Long position(String name) { return jdbc.queryForObject("SELECT id FROM public.job_positions WHERE company_id=? AND name=?",Long.class,root.getId(),name); }
    @AfterEach void clear() { SecurityContextHolder.clearContext();TenantContext.clear();CompanyContext.clear();AccessScopeContext.clear(); }
    @Test void organizationSizePersistsWithoutSelectingAPlanOrChangingIndustry() {
        org.setEmployeeRange(com.example.demo.base.enums.EmployeeRange.EMPLOYEES_21_50);
        em.flush(); em.clear();
        var reloaded=em.find(Organization.class,org.getId());
        assertThat(reloaded.getEmployeeRange()).isEqualTo(com.example.demo.base.enums.EmployeeRange.EMPLOYEES_21_50);
        assertThat(reloaded.getSubscriptionPlan()).isEqualTo(com.example.demo.base.enums.SubscriptionPlan.STANDARD);
        assertThat(reloaded.getIndustryType()).isEqualTo(OrganizationIndustry.SOFTWARE);
    }
    @Test void masterCatalogMaintainsEverySupportedIndustryIndependently() {
        assertThat(setup.catalog()).hasSize(17);
        var software=StandardCompanySetup.templates(OrganizationIndustry.SOFTWARE).stream().flatMap(d -> d.positions().stream()).toList();
        var medical=StandardCompanySetup.templates(OrganizationIndustry.MEDICAL).stream().flatMap(d -> d.positions().stream()).toList();
        assertThat(software).contains("Software Engineer").doesNotContain("Registered Nurse");
        assertThat(medical).contains("Registered Nurse","General Physician","Pharmacist").doesNotContain("Software Engineer");
    }
    @Test void changingToMedicalSelectsClinicalDefaultsInEveryBranchWithoutDeletingSoftwareData() {
        setup.ensureTree(root.getId());Long engineer=position("Software Engineer");
        var employee=new Employee();employee.setFirstName("Retained assignment");employee.setCompany(root);employee.setJobPosition(em.find(JobPosition.class,engineer));em.persist(employee);em.flush();
        templates.apply(root.getId(),OrganizationIndustry.MEDICAL,OrganizationIndustry.SOFTWARE);
        for(Long company:List.of(root.getId(),branch.getId())) {
            assertThat(names(company,"jobPositions")).contains("Registered Nurse","General Physician","CEO").doesNotContain("Software Engineer","DevOps Engineer");
            assertThat(names(company,"departments")).contains("Nursing","Clinical Services").doesNotContain("Engineering");
        }
        assertThat(jdbc.queryForObject("SELECT name FROM public.job_positions WHERE id=?",String.class,engineer)).isEqualTo("Software Engineer");
        assertThat(jdbc.queryForObject("SELECT job_position_id FROM public.employees WHERE id=?",Long.class,employee.getId())).isEqualTo(engineer);
        TenantContext.setTenant("public");
        var allRoles=em.createQuery("select r from JobRole r where r.company.id=:id",JobRole.class).setParameter("id",root.getId()).getResultList();
        assertThat(setup.filterRoles(allRoles)).extracting(JobRole::getName).contains("Registered Nurse").doesNotContain("Software Engineer");
        templates.apply(root.getId(),OrganizationIndustry.SOFTWARE,OrganizationIndustry.MEDICAL);
        assertThat(names(root.getId(),"jobPositions")).contains("Software Engineer").doesNotContain("Registered Nurse");
        assertThat(setup.filterRoles(allRoles)).extracting(JobRole::getName).contains("Software Engineer").doesNotContain("Registered Nurse");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.job_positions WHERE company_id=? AND name='Software Engineer'",Long.class,root.getId())).isEqualTo(1);
    }
    @Test void customPositionsAndRenamedDefaultsRemainSelectableAfterIndustrySwitch() {
        setup.ensure(root.getId());Long department=jdbc.queryForObject("SELECT id FROM public.departments WHERE company_id=? AND name='Engineering'",Long.class,root.getId());
        jdbc.update("INSERT INTO public.job_positions(name,company_id,department_id,is_active) VALUES('Clinical Systems Specialist',?,?,true)",root.getId(),department);
        jdbc.update("UPDATE public.job_positions SET name='Research Systems Engineer' WHERE company_id=? AND name='Software Engineer'",root.getId());
        templates.apply(root.getId(),OrganizationIndustry.MEDICAL,OrganizationIndustry.SOFTWARE);
        assertThat(names(root.getId(),"jobPositions")).contains("Clinical Systems Specialist","Research Systems Engineer").doesNotContain("DevOps Engineer");
        assertThat(names(root.getId(),"departments")).contains("Engineering");
    }
    @Test void switchingAwayAndBackDoesNotRestoreRemovedDefaultPositions() {
        setup.ensure(root.getId());jdbc.update("DELETE FROM public.job_roles WHERE company_id=? AND job_position_id IN (SELECT id FROM public.job_positions WHERE company_id=? AND name='DevOps Engineer')",root.getId(),root.getId());
        jdbc.update("DELETE FROM public.job_positions WHERE company_id=? AND name='DevOps Engineer'",root.getId());
        templates.apply(root.getId(),OrganizationIndustry.MEDICAL,OrganizationIndustry.SOFTWARE);
        templates.apply(root.getId(),OrganizationIndustry.SOFTWARE,OrganizationIndustry.MEDICAL);
        assertThat(names(root.getId(),"jobPositions")).doesNotContain("DevOps Engineer");
    }
    @Test void legacyInitializationAdoptsExistingSoftwareRowsWithoutRecreatingDeletedEntries() {
        var d=new Department();d.setName("Engineering");d.setCompany(root);em.persist(d);
        var p=new JobPosition();p.setName("Software Engineer");p.setDepartment(d);p.setCompany(root);em.persist(p);em.flush();
        jdbc.update("INSERT INTO public.company_setup_defaults(company_id,catalog_version) VALUES(?,1)",root.getId());
        setup.ensure(root.getId());assertThat(names(root.getId(),"jobPositions")).containsExactly("Software Engineer");
        templates.apply(root.getId(),OrganizationIndustry.MEDICAL,OrganizationIndustry.SOFTWARE);
        assertThat(names(root.getId(),"jobPositions")).contains("Registered Nurse").doesNotContain("Software Engineer");
    }
    @Test void staleSelectionsAndOutOfScopeOrganizationsAreRejected() {
        setup.ensureTree(root.getId());templates.apply(root.getId(),OrganizationIndustry.MEDICAL,OrganizationIndustry.SOFTWARE);
        assertThatThrownBy(() -> templates.apply(root.getId(),OrganizationIndustry.RETAIL,OrganizationIndustry.SOFTWARE)).hasMessageContaining("changed");
        AccessScopeContext.set(new AccessScopeContext.ScopeData(admin.getId(),root.getId(),UserRole.AccessScope.SELF,List.of(root.getId())));
        assertThatThrownBy(() -> templates.get(branch.getId())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }
    @Test void platformAdminCanLoadChosenCompanyOptionsFromAllCompaniesMode() {
        setup.ensure(root.getId());AccessScopeContext.clear();
        assertThatThrownBy(() -> setup.options(root.getId())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        var auth=new UsernamePasswordAuthenticationToken(new UserPrincipal(admin),null,List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_PLATFORM_SUPER_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);
        assertThat(rows(root.getId(),"jobPositions")).hasSize(40);
    }
    @Test void generalBusinessStartsWithSharedDepartmentsAndNewBranchesInheritOrganizationType() {
        jdbc.update("UPDATE public.organizations SET industry_type='GENERAL' WHERE id=?",org.getId());setup.ensureTree(root.getId());
        assertThat(rows(root.getId(),"departments")).hasSize(8);assertThat(rows(root.getId(),"jobPositions")).hasSize(33);
        assertThat(names(branch.getId(),"jobPositions")).doesNotContain("Software Engineer","Registered Nurse");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.job_position_access WHERE company_id IN (?,?)",Long.class,root.getId(),branch.getId())).isZero();
    }
}
