package com.example.demo.leave;
import com.example.demo.leave.service.DefaultLeaveTypeService;
import com.example.demo.leave.entity.LeaveType;
import com.example.demo.base.entity.*;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest @Transactional
class DefaultLeaveTypesIntegrationTest {
 @Autowired DefaultLeaveTypeService service;@Autowired EntityManager em;@Autowired JdbcTemplate jdbc;
 Company company;
 @BeforeEach void setup(){TenantContext.clear();jdbc.execute("CREATE TABLE IF NOT EXISTS public.company_setup_templates(company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,catalog_group VARCHAR(40) NOT NULL,initialized_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(company_id,catalog_group))");var org=new Organization();org.setName("Leave fixture "+UUID.randomUUID());org.setSlug("leave-"+UUID.randomUUID());em.persist(org);company=new Company();company.setName("Leave fixture");company.setCountry("India");company.setSchemaName("public");company.setOrganization(org);em.persist(company);em.flush();SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("test-platform",null,List.of(new SimpleGrantedAuthority("ROLE_PLATFORM_SUPER_ADMIN"))));AccessScopeContext.set(new AccessScopeContext.ScopeData(-1L,null,null,List.of()));}
 @AfterEach void clear(){SecurityContextHolder.clearContext();AccessScopeContext.clear();TenantContext.clear();}
 List<String> names(){return jdbc.queryForList("SELECT name FROM public.leave_types WHERE company_id=?",String.class,company.getId());}
 @Test void indiaDefaultsAreIdempotentAndHaveNoAutomaticEntitlements(){assertThat(service.ensureInitial(company.getId())).isEqualTo(8);assertThat(names()).contains("Casual Leave","Annual Leave","Paternity Leave","Sick Leave").doesNotContain("Hajj Leave");assertThat(service.ensureInitial(company.getId())).isZero();assertThat(names()).hasSize(8);assertThat(jdbc.queryForObject("SELECT count(*) FROM public.leave_types WHERE company_id=? AND (total_days<>0 OR accrual_enabled=true OR negative_balance_allowed=true OR leave_validation_type<>'HR_VALIDATION')",Long.class,company.getId())).isZero();assertThat(jdbc.queryForObject("SELECT count(*) FROM public.available_leaves",Long.class)).isZero();}
 @Test void uaeDefaultsUseParentalStudyAndHajjTypes(){company.setCountry("United Arab Emirates");em.flush();assertThat(service.ensureInitial(company.getId())).isEqualTo(10);assertThat(names()).contains("Annual Leave","Sick Leave","Maternity Leave","Parental Leave","Bereavement Leave","Study Leave","Hajj Leave","National Service Leave").doesNotContain("Casual Leave");assertThat(jdbc.queryForObject("SELECT payment_type FROM public.leave_types WHERE company_id=? AND name='Hajj Leave'",String.class,company.getId())).isEqualTo("UNPAID");}
 @Test void unknownCountryProvidesBothRegionalCatalogs(){company.setCountry(null);em.flush();assertThat(service.ensureInitial(company.getId())).isEqualTo(12);assertThat(names()).contains("Casual Leave","Paternity Leave","Parental Leave","Hajj Leave");}
 @Test void aliasesAndCustomizedPoliciesArePreserved(){var existing=new LeaveType();existing.setCompany(company);existing.setName("  Earned Leave  ");existing.setTotalDays(19);existing.setAccrualEnabled(true);em.persist(existing);em.flush();assertThat(service.apply(company.getId(),"INDIA")).isEqualTo(7);assertThat(names()).contains("  Earned Leave  ").doesNotContain("Annual Leave");em.refresh(existing);assertThat(existing.getTotalDays()).isEqualTo(19);assertThat(existing.getAccrualEnabled()).isTrue();}
 @Test void deletedOrInactiveDefaultsAreNotRecreated(){service.ensureInitial(company.getId());jdbc.update("DELETE FROM public.leave_types WHERE company_id=? AND name='Casual Leave'",company.getId());jdbc.update("UPDATE public.leave_types SET is_active=false WHERE company_id=? AND name='Sick Leave'",company.getId());assertThat(service.ensureInitial(company.getId())).isZero();assertThat(names()).hasSize(7);assertThat(jdbc.queryForObject("SELECT is_active FROM public.leave_types WHERE company_id=? AND name='Sick Leave'",Boolean.class,company.getId())).isFalse();}
 @Test void regionalExpansionPreservesExistingTypes(){service.apply(company.getId(),"INDIA");assertThat(service.apply(company.getId(),"UAE")).isEqualTo(4);assertThat(names()).hasSize(12);assertThat(service.apply(company.getId(),"BOTH")).isZero();}
 @Test void companyScopeIsEnforced(){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("scoped-admin",null,List.of(new SimpleGrantedAuthority("ROLE_HR_MANAGER"))));AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,99L,UserRole.AccessScope.BRANCH,List.of(99L)));assertThatThrownBy(()->service.apply(company.getId(),"BOTH")).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);assertThat(names()).isEmpty();}
 @Test void unsupportedRegionsAndUnsafeSchemasAreRejected(){assertThatThrownBy(()->service.apply(company.getId(),"INVALID")).hasMessageContaining("Choose");company.setSchemaName("unsafe;schema");em.flush();assertThatThrownBy(()->service.apply(company.getId(),"INDIA")).hasMessageContaining("workspace");}
 @Test void inheritedOrganizationWidePoliciesAreNotDuplicated(){var head=new Company();head.setName("Head office fixture");head.setSchemaName(null);head.setOrganization(company.getOrganization());em.persist(head);company.setParentCompany(head);company.setCompanyType(Company.CompanyType.BRANCH);var annual=new LeaveType();annual.setName("Annual Leave");annual.setCompany(head);annual.setTotalDays(23);annual.setIsOrganizationWide(true);em.persist(annual);em.flush();assertThat(service.ensureInitial(company.getId())).isEqualTo(7);assertThat(names()).doesNotContain("Annual Leave");em.refresh(annual);assertThat(annual.getTotalDays()).isEqualTo(23);}
 @Test void otherCountriesReceiveOnlyCommonLeaveTypes(){company.setCountry("Canada");em.flush();assertThat(service.ensureInitial(company.getId())).isEqualTo(6);assertThat(names()).doesNotContain("Casual Leave","Hajj Leave","National Service Leave");}
 @Test void countryAliasesAreRecognized(){assertThat(DefaultLeaveTypeService.regionForCountry("IN")).isEqualTo("INDIA");assertThat(DefaultLeaveTypeService.regionForCountry("Dubai")).isEqualTo("UAE");assertThat(DefaultLeaveTypeService.regionForCountry("U.A.E.")).isEqualTo("UAE");assertThat(DefaultLeaveTypeService.regionForCountry(null)).isEqualTo("BOTH");}
}
