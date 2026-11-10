package com.example.demo.employee.service;
import com.example.demo.base.entity.*;
import com.example.demo.employee.entity.*;
import com.example.demo.employee.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest(properties={"app.tenants.schema-sync.enabled=false","app.billing.notices.enabled=false"})
@Transactional
class ReportingManagerBatchIntegrationTest {
 @Autowired EntityManager em;@Autowired EmployeeRepository employees;@Autowired ReportingManagerService managers;
 Company company,other;Employee manager,alternate;
 @BeforeEach void setup(){com.example.demo.common.tenant.TenantContext.clear();var org=new Organization();org.setName("Batch fixture");org.setSlug("batch-"+UUID.randomUUID());em.persist(org);company=company(org);other=company(org);manager=person(company);alternate=person(company);}
 Company company(Organization org){var c=new Company();c.setName("Batch "+UUID.randomUUID());c.setOrganization(org);em.persist(c);return c;}
 Employee person(Company c){var e=new Employee();e.setFirstName("Batch employee");e.setCompany(c);em.persist(e);return e;}
 void profile(Employee e,Employee manager){var w=new EmployeeWorkInformation();w.setEmployee(e);w.setReportingManager(manager);em.persist(w);}
 @Test void honorsProfileOverrideAndExplicitClearWithoutCrossCompanyOrInactiveReports(){
  var legacy=person(company);legacy.setReportingManager(manager);
  var overridden=person(company);overridden.setReportingManager(alternate);profile(overridden,manager);
  var cleared=person(company);cleared.setReportingManager(manager);profile(cleared,null);
  var changed=person(company);changed.setReportingManager(manager);profile(changed,alternate);
  var inactive=person(company);inactive.setReportingManager(manager);inactive.setActive(false);
  var foreign=person(other);foreign.setReportingManager(manager);em.flush();em.clear();
  assertThat(managers.directReports(em.find(Employee.class,manager.getId()))).extracting(Employee::getId).containsExactlyInAnyOrder(legacy.getId(),overridden.getId());
 }
 @Test void orgChartFetchesEmployeeRolesAndLabelsInBoundedQueries(){
  for(int i=0;i<25;i++){var e=person(company);e.setReportingManager(manager);var u=new com.example.demo.auth.entity.User();u.setUsername(UUID.randomUUID()+"@example.invalid");u.setEmail(u.getUsername());u.setPassword("fixture");em.persist(u);e.setUser(u);}
  em.flush();em.clear();var stats=em.getEntityManagerFactory().unwrap(org.hibernate.SessionFactory.class).getStatistics();stats.setStatisticsEnabled(true);stats.clear();
  try{var rows=employees.findOrgChartEmployees(company.getId());for(var e:rows){if(e.getUser()!=null)e.getUser().getUserRoles().forEach(r->r.getRole().getName());}assertThat(rows).hasSize(27);assertThat(stats.getPrepareStatementCount()).isLessThan(5);}finally{stats.setStatisticsEnabled(false);}
 }
}
