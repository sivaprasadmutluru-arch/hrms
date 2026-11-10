package com.example.demo.helpdesk;
import com.example.demo.base.entity.*;
import com.example.demo.employee.entity.Employee;
import com.example.demo.helpdesk.entity.DepartmentManager;
import com.example.demo.helpdesk.service.HelpdeskService;
import com.example.demo.common.context.*;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.auth.entity.UserRole;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest(properties="app.billing.notices.enabled=false") @Transactional
class DepartmentManagerIntegrationTest {
 @Autowired EntityManager em; @Autowired HelpdeskService service;
 Company company,other;Department department,otherDepartment;Employee employee,otherEmployee;
 @BeforeEach void setup(){TenantContext.clear();var org=new Organization();org.setName("Helpdesk fixture "+UUID.randomUUID());org.setSlug("helpdesk-"+UUID.randomUUID());em.persist(org);company=new Company();company.setName("Support company "+UUID.randomUUID());company.setSchemaName("public");company.setOrganization(org);em.persist(company);other=new Company();other.setName("Other branch "+UUID.randomUUID());other.setCompanyType(Company.CompanyType.BRANCH);other.setParentCompany(company);other.setOrganization(org);em.persist(other);department=department(company,"Engineering");otherDepartment=department(other,"Other Engineering");employee=employee(company,"Named","Manager");otherEmployee=employee(other,"Other","Employee");em.flush();scope(false);}
 Department department(Company c,String name){var d=new Department();d.setCompany(c);d.setName(name);em.persist(d);return d;}
 Employee employee(Company c,String first,String last){var e=new Employee();e.setCompany(c);e.setFirstName(first);e.setLastName(last);e.setEmail(UUID.randomUUID()+"@example.invalid");em.persist(e);return e;}
 void scope(boolean platform){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("fixture-admin",null,List.of(new SimpleGrantedAuthority("ROLE_"+(platform?"PLATFORM_SUPER_ADMIN":"HR_MANAGER")))));AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,platform?null:company.getId(),platform?null:UserRole.AccessScope.BRANCH,platform?List.of():List.of(company.getId())));CompanyContext.set(platform?null:company.getId());}
 DepartmentManager request(Department d,Employee e){var a=new DepartmentManager();a.setDepartment(d);a.setManager(e);return a;}
 @AfterEach void clear(){SecurityContextHolder.clearContext();AccessScopeContext.clear();CompanyContext.clear();TenantContext.clear();}
 @Test void assignmentsReturnNamesAndServerDerivedCompany(){var request=request(department,employee);request.setCompany(other);var result=service.assignDepartmentManager(request);assertThat(result.get("companyId")).isEqualTo(company.getId());assertThat(((Map<?,?>)result.get("manager")).get("firstName")).isEqualTo("Named");assertThat(((Map<?,?>)result.get("department")).get("name")).isEqualTo("Engineering");assertThat(service.listDepartmentManagers(null)).hasSize(1);}
 @Test void duplicateAssignmentIsIdempotent(){var first=service.assignDepartmentManager(request(department,employee));var second=service.assignDepartmentManager(request(department,employee));assertThat(second.get("id")).isEqualTo(first.get("id"));assertThat(service.listDepartmentManagers(null)).hasSize(1);}
 @Test void differentCompanyEmployeeIsRejected(){assertThatThrownBy(()->service.assignDepartmentManager(request(department,otherEmployee))).hasMessageContaining("same company");}
 @Test void departmentFilterAndRemovalCannotBypassCompanyScope(){scope(true);var foreign=service.assignDepartmentManager(request(otherDepartment,otherEmployee));scope(false);assertThat(service.listDepartmentManagers(null)).isEmpty();assertThatThrownBy(()->service.listDepartmentManagers(otherDepartment.getId())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);assertThatThrownBy(()->service.removeDepartmentManager((Long)foreign.get("id"))).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);assertThatThrownBy(()->service.assignDepartmentManager(request(otherDepartment,otherEmployee))).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);}
 @Test void removedAssignmentCanBeRestoredWithoutDuplicateRows(){var first=service.assignDepartmentManager(request(department,employee));service.removeDepartmentManager((Long)first.get("id"));assertThat(service.listDepartmentManagers(null)).isEmpty();var restored=service.assignDepartmentManager(request(department,employee));assertThat(restored.get("id")).isEqualTo(first.get("id"));assertThat(service.listDepartmentManagers(null)).hasSize(1);}
 @Test void inactiveEmployeesAreNotChoicesOrActiveSupportContacts(){service.assignDepartmentManager(request(department,employee));employee.setActive(false);em.flush();assertThat((List<?>)service.departmentManagerOptions(company.getId(),"").get("employees")).isEmpty();assertThat(service.listDepartmentManagers(null)).isEmpty();assertThatThrownBy(()->service.assignDepartmentManager(request(department,employee))).hasMessageContaining("active");}
 @Test void employeeSearchIsScopedAndDoesNotExposeFullEmployeeRecords(){var result=service.departmentManagerOptions(company.getId(),"Named Manager");var rows=(List<?>)result.get("employees");assertThat(rows).hasSize(1);assertThat(((Map<?,?>)rows.getFirst()).keySet().toString()).contains("id","name","email").doesNotContain("salary","password","nationality");assertThat((List<?>)service.departmentManagerOptions(company.getId(),"Other").get("employees")).isEmpty();assertThatThrownBy(()->service.departmentManagerOptions(other.getId(),"")).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);}
 @Test void missingSelectionsAndClientSuppliedAssignmentIdsAreRejected(){assertThatThrownBy(()->service.assignDepartmentManager(new DepartmentManager())).hasMessageContaining("Select");var r=request(department,employee);r.setId(999L);assertThatThrownBy(()->service.assignDepartmentManager(r)).hasMessageContaining("Select");}
}
