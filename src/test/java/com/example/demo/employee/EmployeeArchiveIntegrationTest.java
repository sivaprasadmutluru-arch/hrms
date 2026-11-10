package com.example.demo.employee;
import com.example.demo.auth.entity.*;
import com.example.demo.auth.repository.RoleRepository;
import com.example.demo.auth.security.UserDetailsServiceImpl;
import com.example.demo.base.entity.*;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.service.EmployeeService;
import com.example.demo.common.context.*;
import com.example.demo.common.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@Transactional
class EmployeeArchiveIntegrationTest {
 @Autowired EntityManager em;@Autowired EmployeeService service;@Autowired UserDetailsServiceImpl details;@Autowired RoleRepository roles;
 Employee employee;User user;
 @BeforeEach void setup(){TenantContext.clear();var org=new Organization();org.setName("Archive fixture "+UUID.randomUUID());org.setSlug("archive-"+UUID.randomUUID());em.persist(org);var company=new Company();company.setName("Archive fixture company");company.setSchemaName("public");company.setOrganization(org);em.persist(company);user=new User();user.setUsername("archive-"+UUID.randomUUID());user.setEmail(user.getUsername()+"@example.invalid");user.setPassword("not-a-real-login");em.persist(user);var role=roles.findByName(Role.RoleName.EMPLOYEE).orElseGet(()->{var r=new Role();r.setName(Role.RoleName.EMPLOYEE);em.persist(r);return r;});var ur=new UserRole();ur.setUser(user);ur.setRole(role);ur.setCompany(company);ur.setAccessScope(UserRole.AccessScope.SELF);em.persist(ur);user.getUserRoles().add(ur);employee=new Employee();employee.setCompany(company);employee.setUser(user);employee.setFirstName("Archive");employee.setLastName("Fixture");em.persist(employee);em.flush();AccessScopeContext.set(new AccessScopeContext.ScopeData(-100L,company.getId(),null,List.of()));SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("test-admin",null,List.of(new SimpleGrantedAuthority("ROLE_PLATFORM_SUPER_ADMIN"))));}
 @AfterEach void clear(){SecurityContextHolder.clearContext();AccessScopeContext.clear();CompanyContext.clear();TenantContext.clear();}
 @Test void archiveIsReadFromActualTenantTableAndRestoreReenablesEligibleLogin(){assertThat(details.loadUserByUsername(user.getUsername()).isEnabled()).isTrue();service.doDelete(employee.getId());em.flush();assertThat(details.loadUserByUsername(user.getUsername()).isEnabled()).isFalse();assertThat(em.find(Employee.class,employee.getId())).isNotNull();service.doRestore(employee.getId());em.flush();assertThat(details.loadUserByUsername(user.getUsername()).isEnabled()).isTrue();}
 @Test void restorePreservesIndependentHoldAndInactiveAccount(){user.setLoginHeld(true);user.setActive(false);service.doDelete(employee.getId());em.flush();service.doRestore(employee.getId());em.flush();assertThat(employee.isActive()).isTrue();assertThat(user.isLoginHeld()).isTrue();assertThat(user.isActive()).isFalse();assertThat(details.loadUserByUsername(user.getUsername()).isEnabled()).isFalse();}
}
