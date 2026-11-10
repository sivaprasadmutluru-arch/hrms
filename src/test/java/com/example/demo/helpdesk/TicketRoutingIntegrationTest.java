package com.example.demo.helpdesk;
import com.example.demo.base.entity.*;
import com.example.demo.employee.entity.Employee;
import com.example.demo.helpdesk.entity.DepartmentManager;
import com.example.demo.helpdesk.service.HelpdeskService;
import com.example.demo.common.context.*;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.entity.User;
import com.example.demo.helpdesk.entity.Ticket;
import com.example.demo.helpdesk.controller.TicketController;
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
class TicketRoutingIntegrationTest {
 @Autowired EntityManager em; @Autowired HelpdeskService service;
 Company company,other;Department department,otherDepartment;Employee employee,otherEmployee;
 void setup(){TenantContext.clear();var org=new Organization();org.setName("Helpdesk fixture "+UUID.randomUUID());org.setSlug("helpdesk-"+UUID.randomUUID());em.persist(org);company=new Company();company.setName("Support company "+UUID.randomUUID());company.setSchemaName("public");company.setOrganization(org);em.persist(company);other=new Company();other.setName("Other branch "+UUID.randomUUID());other.setCompanyType(Company.CompanyType.BRANCH);other.setParentCompany(company);other.setOrganization(org);em.persist(other);department=department(company,"Engineering");otherDepartment=department(other,"Other Engineering");employee=employee(company,"Named","Manager");otherEmployee=employee(other,"Other","Employee");em.flush();scope(false);}
 Department department(Company c,String name){var d=new Department();d.setCompany(c);d.setName(name);em.persist(d);return d;}
 Employee employee(Company c,String first,String last){var e=new Employee();e.setCompany(c);e.setFirstName(first);e.setLastName(last);e.setEmail(UUID.randomUUID()+"@example.invalid");em.persist(e);return e;}
 void scope(boolean platform){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("fixture-admin",null,List.of(new SimpleGrantedAuthority("ROLE_"+(platform?"PLATFORM_SUPER_ADMIN":"HR_MANAGER")))));AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,platform?null:company.getId(),platform?null:UserRole.AccessScope.BRANCH,platform?List.of():List.of(company.getId())));CompanyContext.set(platform?null:company.getId());}
 DepartmentManager request(Department d,Employee e){var a=new DepartmentManager();a.setDepartment(d);a.setManager(e);return a;}
 @AfterEach void clear(){SecurityContextHolder.clearContext();AccessScopeContext.clear();CompanyContext.clear();TenantContext.clear();}
 @Autowired TicketController controller;
 Employee requester,backup;
 User login(Employee e){var u=new User();u.setUsername(UUID.randomUUID().toString());u.setEmail(u.getUsername()+"@example.invalid");u.setPassword("fixture-not-a-login");em.persist(u);e.setUser(u);em.flush();return u;}
 @BeforeEach void prepareRouting(){setup();requester=employee(company,"Ticket","Requester");backup=employee(company,"Backup","Contact");login(requester);login(employee);login(backup);login(otherEmployee);signIn(requester,false);}
 void signIn(Employee e,boolean edit){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("fixture",null,edit?List.of(new SimpleGrantedAuthority("helpdesk:view"),new SimpleGrantedAuthority("helpdesk:edit")):List.of(new SimpleGrantedAuthority("helpdesk:view"),new SimpleGrantedAuthority("helpdesk:create"))));AccessScopeContext.set(new AccessScopeContext.ScopeData(e.getUser().getId(),e.getCompany().getId(),UserRole.AccessScope.SELF,List.of(e.getCompany().getId())));CompanyContext.set(e.getCompany().getId());}
 Ticket ticket(){var t=new Ticket();t.setTitle("Laptop setup");t.setDepartment(department);return t;}
 @Test void departmentRoutesToOldestActiveContactAndShowsNames(){service.assignDepartmentManager(request(department,employee));service.assignDepartmentManager(request(department,backup));var t=service.createTicket(ticket());assertThat(t.getAssignedTo().getId()).isEqualTo(employee.getId());assertThat(t.getRaisedBy().getId()).isEqualTo(requester.getId());assertThat(t.getDepartment().getId()).isEqualTo(department.getId());var view=service.routingView(t);assertThat(((Map<?,?>)view.get("assignedTo")).get("name")).isEqualTo("Named Manager");assertThat(view).doesNotContainKeys("salary","password","raisedBy");}
 @Test void removedOrInactiveContactFallsBackWithoutChangingExistingTicket(){var a=service.assignDepartmentManager(request(department,employee));service.assignDepartmentManager(request(department,backup));var old=service.createTicket(ticket());service.removeDepartmentManager((Long)a.get("id"));assertThat(service.createTicket(ticket()).getAssignedTo().getId()).isEqualTo(backup.getId());backup.setActive(false);em.flush();assertThat(service.createTicket(ticket()).getAssignedTo()).isNull();assertThat(old.getAssignedTo().getId()).isEqualTo(employee.getId());}
 @Test void generalOrUnconfiguredDepartmentWaitsForManualAssignment(){assertThat(service.createTicket(ticket()).getAssignedTo()).isNull();var t=ticket();t.setDepartment(null);assertThat(service.createTicket(t).getAssignedTo()).isNull();}
 @Test void requesterCompanyAndAssigneeCannotBeForged(){service.assignDepartmentManager(request(department,employee));var input=ticket();input.setRaisedBy(otherEmployee);input.setAssignedTo(otherEmployee);input.setCompany(other);var t=service.createTicket(input);assertThat(t.getRaisedBy().getId()).isEqualTo(requester.getId());assertThat(t.getCompany().getId()).isEqualTo(company.getId());assertThat(t.getAssignedTo().getId()).isEqualTo(employee.getId());}
 @Test void crossCompanyAndInactiveDepartmentsRejected(){var t=ticket();t.setDepartment(otherDepartment);assertThatThrownBy(()->service.createTicket(t)).hasMessageContaining("ticket company");department.setActive(false);em.flush();assertThatThrownBy(()->service.createTicket(ticket())).hasMessageContaining("active department");}
 @Test void manualReassignmentValidatesCompanyAndIsVisible(){var t=service.createTicket(ticket());signIn(requester,true);var result=controller.assign(t.getId(),employee.getId()).getBody();assertThat(((Map<?,?>)result.get("assignedTo")).get("id")).isEqualTo(employee.getId());assertThatThrownBy(()->controller.assign(t.getId(),otherEmployee.getId())).hasMessageContaining("ticket company");}
 @Test void assignedContactCanResolveButUnassignedEmployeeCannot(){service.assignDepartmentManager(request(department,employee));var t=service.createTicket(ticket());assertThatThrownBy(()->controller.resolve(t.getId())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);signIn(employee,false);assertThat(controller.resolve(t.getId()).getBody().get("status")).isEqualTo(Ticket.TicketStatus.RESOLVED);assertThat(controller.close(t.getId()).getBody().get("status")).isEqualTo(Ticket.TicketStatus.CLOSED);}
 @Test void ticketIdAndDepartmentOptionsRespectCompanyBoundary(){var t=service.createTicket(ticket());signIn(otherEmployee,false);assertThatThrownBy(()->service.getTicketById(t.getId())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);assertThatThrownBy(()->service.ticketDepartments(company.getId())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);}
 @Test void commentsUseSignedInAuthorWithoutManualId(){var t=service.createTicket(ticket());var c=service.addComment(t.getId(),"Please help",otherEmployee.getId());assertThat(c.getCommentedBy().getId()).isEqualTo(requester.getId());}
 @Test void inactiveLoginIsSkippedAndDepartmentFilterUsesSupportDepartment(){service.assignDepartmentManager(request(department,employee));employee.getUser().setActive(false);em.flush();var t=service.createTicket(ticket());assertThat(t.getAssignedTo()).isNull();assertThat(service.getTicketsByDepartment(department.getId())).extracting(Ticket::getId).contains(t.getId());assertThatThrownBy(()->service.assignTicket(t.getId(),employee.getId())).hasMessageContaining("login");}
}
