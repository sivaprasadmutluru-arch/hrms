package com.example.demo.helpdesk;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.auth.controller.AuthController;
import com.example.demo.base.entity.*;
import com.example.demo.employee.entity.Employee;
import com.example.demo.helpdesk.entity.*;
import com.example.demo.helpdesk.service.HelpdeskService;
import com.example.demo.helpdesk.controller.TicketController;
import com.example.demo.common.context.*;
import com.example.demo.common.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest(properties={"spring.jpa.open-in-view=false","app.billing.notices.enabled=false"})
class TicketDetachedResponseIntegrationTest {
 @Autowired EntityManager em;@Autowired PlatformTransactionManager transactions;@Autowired HelpdeskService service;@Autowired TicketController controller;@Autowired AuthController auth;@Autowired com.fasterxml.jackson.databind.ObjectMapper mapper;
 Long companyId,employeeId,departmentId,userId;UserPrincipal principal;
 @BeforeEach void setup(){TenantContext.clear();new TransactionTemplate(transactions).executeWithoutResult(tx->{
  var org=new Organization();org.setName("Detached response fixture "+UUID.randomUUID());org.setSlug("detached-"+UUID.randomUUID());em.persist(org);
  var c=new Company();c.setName("Fixture "+UUID.randomUUID());c.setSchemaName("fixture_"+UUID.randomUUID().toString().replace("-",""));c.setOrganization(org);em.persist(c);companyId=c.getId();
  var user=new User();user.setUsername("98765"+UUID.randomUUID());user.setEmail(UUID.randomUUID()+"@example.invalid");user.setPassword("fixture-not-a-login");em.persist(user);userId=user.getId();principal=new UserPrincipal(user);
  var e=new Employee();e.setFirstName("Employee");e.setLastName("Display Name");e.setEmail(user.getEmail());e.setCompany(c);e.setUser(user);em.persist(e);employeeId=e.getId();
  var d=new Department();d.setName("Helpdesk fixture");d.setCompany(c);em.persist(d);departmentId=d.getId();
  var assignment=new DepartmentManager();assignment.setDepartment(d);assignment.setManager(e);assignment.setCompany(c);em.persist(assignment);
 });SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,List.of(new SimpleGrantedAuthority("helpdesk:view"),new SimpleGrantedAuthority("helpdesk:create"))));AccessScopeContext.set(new AccessScopeContext.ScopeData(userId,companyId,UserRole.AccessScope.SELF,List.of(companyId)));CompanyContext.set(companyId);}
 @AfterEach void clear(){SecurityContextHolder.clearContext();AccessScopeContext.clear();CompanyContext.clear();TenantContext.clear();}
 Ticket create(){var t=new Ticket();t.setTitle("Detached ticket response");var d=new Department();d.setId(departmentId);t.setDepartment(d);return service.createTicket(t);}
 @Test void listAndDetailSerializeAfterCreationAndReadTransactionsClose()throws Exception {
  var saved=create();var detached=service.getTicketById(saved.getId());
  // Access checks may initialize the requester; serialization must work with OSIV off.
  assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
  var rows=controller.list().getBody();assertThat(rows).hasSize(1);var view=controller.get(saved.getId()).getBody();
  assertThat(view.get("requesterName")).isEqualTo("Employee Display Name");assertThat(((Map<?,?>)view.get("assignedTo")).get("name")).isEqualTo("Employee Display Name");assertThat(view.get("canHandle")).isEqualTo(true);
  assertThat(mapper.writeValueAsString(rows)).contains("Employee Display Name","Helpdesk fixture").doesNotContain("hibernateLazyInitializer");
 }
 @Test void commentsAndAttachmentsSerializeOutsideTheirWriteTransactions()throws Exception{
  var t=create();var c=controller.addComment(t.getId(),Map.of("comment","Please check this issue")).getBody();assertThat(c.get("authorName")).isEqualTo("Employee Display Name");
  assertThat(mapper.writeValueAsString(controller.listComments(t.getId()).getBody())).contains("Please check this issue");
  var a=new TicketAttachment();a.setFilePath("local-qa-fixture");a.setFileName("qa.txt");var attachment=controller.addAttachment(t.getId(),a).getBody();assertThat(attachment.get("fileName")).isEqualTo("qa.txt");assertThat(mapper.writeValueAsString(controller.listAttachments(t.getId()).getBody())).doesNotContain("raisedBy").contains("qa.txt");
 }
 @Test void profileReturnsEmployeeNameSeparatelyFromPhoneLoginIdentifier(){var response=auth.me(principal).getBody();assertThat(response.get("name")).isEqualTo("Employee Display Name");assertThat(response.get("firstName")).isEqualTo("Employee");assertThat(response.get("lastName")).isEqualTo("Display Name");assertThat(response.get("username")).isEqualTo(principal.getUsername());}
 @Test void listUsesBoundedQueriesInsteadOfReloadingEachTicket(){
  for(int i=0;i<25;i++)create();
  var statistics=em.getEntityManagerFactory().unwrap(org.hibernate.SessionFactory.class).getStatistics();
  statistics.setStatisticsEnabled(true);statistics.clear();
  try {assertThat(controller.list().getBody()).hasSize(25);
   assertThat(statistics.getPrepareStatementCount()).isLessThan(10);
  } finally {statistics.setStatisticsEnabled(false);}
 }
 @Test void selfUserCannotReadAnotherEmployeesTicket(){
  Long foreignId=new TransactionTemplate(transactions).execute(tx->{
   var u=new User();u.setUsername(UUID.randomUUID()+"@example.invalid");u.setEmail(u.getUsername());u.setPassword("not-a-login");em.persist(u);
   var e=new Employee();e.setFirstName("Other");e.setCompany(em.find(Company.class,companyId));e.setUser(u);em.persist(e);
   var ticket=new Ticket();ticket.setTitle("Private other employee request");ticket.setCompany(e.getCompany());ticket.setRaisedBy(e);em.persist(ticket);return ticket.getId();
  });
  assertThat(controller.list().getBody()).isEmpty();
  assertThatThrownBy(()->controller.get(foreignId)).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
 }

}
