package com.example.demo.employee;
import com.example.demo.employee.service.EmployeeLoginHoldService;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.entity.Employee;
import com.example.demo.auth.entity.*;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.auth.security.*;
import com.example.demo.audit.*;
import com.example.demo.audit.entity.AuditLog;
import com.example.demo.base.entity.Company;
import com.example.demo.common.context.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.mock.web.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeLoginHoldTest {
 @Mock EmployeeRepository employees; @Mock UserRepository users; @Mock AuditLogRepository audit;
 EmployeeLoginHoldService service; User target; Employee employee; Company company;
 @BeforeEach void setup() {
  service=new EmployeeLoginHoldService(employees,users,audit,new ObjectMapper());
  company=new Company();company.setId(12L);
  employee=new Employee();employee.setId(3L);employee.setCompany(company);
  target=new User();target.setId(44L);target.setUsername("staff");target.setPassword("unused");employee.setUser(target);
  signIn(true);
 }
 void signIn(boolean platform) {
  var actor=new User();actor.setId(1L);actor.setUsername("admin");actor.setPassword("unused");
  var principal=new UserPrincipal(actor,List.of());
  SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,List.of(new SimpleGrantedAuthority(platform?"ROLE_PLATFORM_SUPER_ADMIN":"ROLE_HR_MANAGER"))));
  AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,12L,UserRole.AccessScope.BRANCH,List.of(12L)));
 }
 void stub(){when(employees.findById(3L)).thenReturn(Optional.of(employee));when(users.findByIdForUpdate(44L)).thenReturn(Optional.of(target));}
 @AfterEach void clear(){SecurityContextHolder.clearContext();AccessScopeContext.clear();}
 @Test void holdAndResumePreserveEmploymentAndAccountStatusAndAuditReason() {
  stub();service.setHold(3L,12L,true,"Review requested");
  assertThat(target.isLoginHeld()).isTrue();assertThat(target.isActive()).isTrue();assertThat(employee.isActive()).isTrue();
  var captor=ArgumentCaptor.forClass(AuditLog.class);verify(audit).save(captor.capture());
  assertThat(captor.getValue().getAction()).isEqualTo("LOGIN_HELD");assertThat(captor.getValue().getNewValues()).contains("Review requested","44");assertThat(captor.getValue().getChangedBy()).isEqualTo("admin");
  target.setActive(false);service.setHold(3L,12L,false,"Review complete");
  assertThat(target.isLoginHeld()).isFalse();assertThat(target.isActive()).isFalse();assertThat(new UserPrincipal(target,List.of()).isEnabled()).isFalse();
 }
 @Test void sameRequestDoesNotDuplicateAudit(){stub();target.setLoginHeld(true);service.setHold(3L,12L,true,"Retry");verifyNoInteractions(audit);}
 @Test void reasonRequired(){assertThatThrownBy(()->service.setHold(3L,12L,true," ")).hasMessageContaining("reason");verifyNoInteractions(users);}
 @Test void outsideCompanyIsRejectedBeforeAccountMutation(){when(employees.findById(3L)).thenReturn(Optional.of(employee));assertThatThrownBy(()->service.setHold(3L,99L,true,"Review")).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);verifyNoInteractions(users);}
 @Test void companyScopedAdminCannotChangeForeignEmployee(){signIn(false);assertThatThrownBy(()->service.setHold(3L,99L,true,"Review")).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);verifyNoInteractions(employees,users);}
 @Test void selfHoldRejected(){stub();var self=new User();self.setId(44L);self.setUsername("staff");self.setPassword("unused");SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(new UserPrincipal(self,List.of()),null,List.of(new SimpleGrantedAuthority("ROLE_PLATFORM_SUPER_ADMIN"))));assertThatThrownBy(()->service.setHold(3L,12L,true,"Review")).hasMessageContaining("own login");verifyNoInteractions(audit);}
 @Test void platformAccountProtected(){stub();var role=new Role();role.setName(Role.RoleName.PLATFORM_SUPER_ADMIN);var grant=new UserRole();grant.setRole(role);grant.setUser(target);target.getUserRoles().add(grant);assertThatThrownBy(()->service.setHold(3L,12L,true,"Review")).hasMessageContaining("Platform administrator");verifyNoInteractions(audit);}
 @Test void employeeWithoutLoginCannotBeHeld(){when(employees.findById(3L)).thenReturn(Optional.of(employee));employee.setUser(null);assertThatThrownBy(()->service.setHold(3L,12L,true,"Review")).hasMessageContaining("no login account");verifyNoInteractions(users,audit);}
 @Test void scopedAdministratorCannotHoldAdministratorAccount(){stub();signIn(false);var role=new Role();role.setName(Role.RoleName.ENTERPRISE_ADMIN);var grant=new UserRole();grant.setUser(target);grant.setRole(role);grant.setCompany(company);target.getUserRoles().add(grant);assertThatThrownBy(()->service.setHold(3L,12L,true,"Review")).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);assertThat(target.isLoginHeld()).isFalse();verifyNoInteractions(audit);}
 @Test void accountWithOtherCompanyAccessCannotBeHeldByScopedAdministrator(){stub();signIn(false);var other=new Company();other.setId(99L);var role=new Role();role.setName(Role.RoleName.EMPLOYEE);var grant=new UserRole();grant.setRole(role);grant.setUser(target);grant.setCompany(other);target.getUserRoles().add(grant);assertThatThrownBy(()->service.setHold(3L,12L,true,"Review")).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);assertThat(target.isLoginHeld()).isFalse();verifyNoInteractions(audit);}
 @Test void heldAccountCannotAuthenticateWithCorrectPassword(){
  var encoder=new BCryptPasswordEncoder();target.setPassword(encoder.encode("fixture-password"));target.setLoginHeld(true);
  var provider=new DaoAuthenticationProvider();provider.setPasswordEncoder(encoder);provider.setUserDetailsService(name->new UserPrincipal(target,List.of()));
  assertThatThrownBy(()->provider.authenticate(new UsernamePasswordAuthenticationToken("staff","fixture-password"))).isInstanceOf(DisabledException.class);
  target.setLoginHeld(false);assertThat(provider.authenticate(new UsernamePasswordAuthenticationToken("staff","fixture-password")).isAuthenticated()).isTrue();
 }
 @Test void existingBearerTokenCannotAuthenticateAfterArchiving() throws Exception {
  var tokens=mock(JwtTokenProvider.class);var details=mock(UserDetailsServiceImpl.class);var principal=new UserPrincipal(target,List.of());principal.setEmploymentArchived(true);
  when(tokens.validateToken("archived-token")).thenReturn(true);when(tokens.getUsernameFromToken("archived-token")).thenReturn("staff");when(details.loadUserByUsername("staff")).thenReturn(principal);
  var request=new MockHttpServletRequest();request.addHeader("Authorization","Bearer archived-token");
  new JwtAuthFilter(tokens,details).doFilter(request,new MockHttpServletResponse(),(req,res)->assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull());
 }
 @Test void existingBearerTokenCannotAuthenticateWhileHeld() throws Exception {
  var tokens=mock(JwtTokenProvider.class);var details=mock(UserDetailsServiceImpl.class);target.setLoginHeld(true);
  when(tokens.validateToken("fixture-token")).thenReturn(true);when(tokens.getUsernameFromToken("fixture-token")).thenReturn("staff");when(details.loadUserByUsername("staff")).thenReturn(new UserPrincipal(target,List.of()));
  var request=new MockHttpServletRequest();request.addHeader("Authorization","Bearer fixture-token");
  new JwtAuthFilter(tokens,details).doFilter(request,new MockHttpServletResponse(),(req,res)->assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull());
 }
}
