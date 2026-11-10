package com.example.demo.base.service;
import com.example.demo.base.entity.*;
import com.example.demo.base.dto.CompanyRequest;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.common.context.*;
import com.example.demo.common.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest @Transactional
class StandardCompanySetupIntegrationTest {
    @Autowired StandardCompanySetup setup;
    @Autowired CompanyService companyService;
    @Autowired EntityManager em;
    @Autowired JdbcTemplate jdbc;
    Company root;
    @BeforeEach void fixture() {
        TenantContext.clear();CompanyContext.clear();AccessScopeContext.clear();
        root=new Company();root.setName("Standard setup test "+UUID.randomUUID());root.setSchemaName("public");em.persist(root);em.flush();
    }
    @AfterEach void clear() { TenantContext.clear();CompanyContext.clear();AccessScopeContext.clear(); }
    long count(String table,Long company) { return jdbc.queryForObject("SELECT count(*) FROM public."+table+" WHERE company_id=?",Long.class,company); }
    @Test void newCompanyGetsCompleteCatalogOnceWithoutAccessGrants() {
        setup.ensure(root.getId()); setup.ensure(root.getId());
        assertThat(count("departments",root.getId())).isEqualTo(9);assertThat(count("job_positions",root.getId())).isEqualTo(40);
        assertThat(count("company_setup_defaults",root.getId())).isEqualTo(1);assertThat(count("job_position_access",root.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.job_positions j JOIN public.departments d ON d.id=j.department_id WHERE j.company_id=? AND d.company_id<>j.company_id",Long.class,root.getId())).isZero();
    }
    @Test void matchingRolesAreBackfilledOnceWithoutOverwritingCustomRolesOrRestoringRemovals() {
        setup.ensure(root.getId());
        assertThat(count("job_roles",root.getId())).isEqualTo(40);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.job_roles r JOIN public.job_positions p ON p.id=r.job_position_id WHERE r.company_id=? AND (r.name<>p.name OR r.company_id<>p.company_id)",Long.class,root.getId())).isZero();
        jdbc.update("UPDATE public.job_roles SET name='Chief Executive' WHERE company_id=? AND name='CEO'",root.getId());
        jdbc.update("DELETE FROM public.job_roles WHERE company_id=? AND name='Intern'",root.getId());
        setup.ensure(root.getId());
        assertThat(count("job_roles",root.getId())).isEqualTo(39);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.job_roles WHERE company_id=? AND name='Chief Executive'",Long.class,root.getId())).isEqualTo(1);
        // Simulate an existing workspace receiving this upgrade, with matching custom rows retained.
        jdbc.update("DELETE FROM public.company_setup_templates WHERE company_id=? AND catalog_group LIKE 'JOB_ROLES_V1_%'",root.getId());
        setup.ensure(root.getId());setup.ensure(root.getId());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.job_roles WHERE company_id=? AND name='Software Engineer'",Long.class,root.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.job_roles WHERE company_id=? AND name='Chief Executive'",Long.class,root.getId())).isEqualTo(1);
        assertThat(count("job_position_access",root.getId())).isZero();
    }
    @Test void seedReusesExistingCatalogAndPreservesCustomEntries() {
        var d=new Department();d.setName("HR");d.setCompany(root);em.persist(d);
        var p=new JobPosition();p.setName("HR Manager");p.setCompany(root);p.setDepartment(d);em.persist(p);
        var custom=new JobPosition();custom.setName("People Experience Specialist");custom.setCompany(root);custom.setDepartment(d);em.persist(custom);em.flush();
        setup.ensure(root.getId());
        assertThat(count("departments",root.getId())).isEqualTo(9);assertThat(count("job_positions",root.getId())).isEqualTo(41);
        assertThat(jdbc.queryForObject("SELECT department_id FROM public.job_positions WHERE id=?",Long.class,p.getId())).isEqualTo(d.getId());
        assertThat(jdbc.queryForObject("SELECT name FROM public.job_positions WHERE id=?",String.class,custom.getId())).isEqualTo("People Experience Specialist");
    }
    @Test void laterCustomizationAndRemovalAreNotUndoneByRestartInitialization() {
        setup.ensure(root.getId());
        jdbc.update("UPDATE public.job_positions SET name='President' WHERE company_id=? AND name='CEO'",root.getId());
        jdbc.update("DELETE FROM public.job_roles WHERE company_id=? AND job_position_id IN (SELECT id FROM public.job_positions WHERE company_id=? AND name='Intern')",root.getId(),root.getId());
        jdbc.update("DELETE FROM public.job_positions WHERE company_id=? AND name='Intern'",root.getId());
        jdbc.update("UPDATE public.departments SET name='People and Culture' WHERE company_id=? AND name='Human Resources'",root.getId());
        setup.ensure(root.getId());
        assertThat(count("job_positions",root.getId())).isEqualTo(39);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.job_positions WHERE company_id=? AND name IN ('CEO','Intern')",Long.class,root.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.departments WHERE company_id=? AND name='People and Culture'",Long.class,root.getId())).isEqualTo(1);
    }
    @Test void branchCreationIncludesItsOwnStandardOptionsAndCustomChoicesStayCompanyScoped() {
        var request=new CompanyRequest();request.setName("Standard branch test "+UUID.randomUUID());
        var branch=companyService.createBranch(root.getId(),request);
        assertThat(count("job_positions",branch.getId())).isEqualTo(40);
        setup.ensure(root.getId());
        AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,root.getId(),UserRole.AccessScope.ENTERPRISE,List.of(root.getId(),branch.getId())));
        var options=setup.options(branch.getId());
        assertThat((List<?>)options.get("departments")).hasSize(9);assertThat((List<?>)options.get("jobPositions")).hasSize(40);
        var positions=(List<Map<String,Object>>)options.get("jobPositions");
        var ceo=positions.stream().filter(p -> p.get("name").equals("CEO")).findFirst().orElseThrow();assertThat(ceo).containsKey("departmentId");
        AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,root.getId(),UserRole.AccessScope.SELF,List.of(root.getId())));
        assertThatThrownBy(() -> setup.options(branch.getId())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }
    @Test void provisioningInitializesHeadOfficeAndBranchesBeforeWorkspaceIsMarkedReady() {
        root.setSchemaReady(false);
        var branch=new Company();branch.setName("Pending branch test "+UUID.randomUUID());branch.setCompanyType(Company.CompanyType.BRANCH);branch.setParentCompany(root);em.persist(branch);em.flush();
        setup.ensureTree(root.getId());
        assertThat(count("departments",root.getId())).isEqualTo(9);assertThat(count("job_positions",root.getId())).isEqualTo(40);
        assertThat(count("departments",branch.getId())).isEqualTo(9);assertThat(count("job_positions",branch.getId())).isEqualTo(40);
    }
}
