package com.example.demo.employee;
import com.example.demo.employee.service.EmployeeService;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.entity.Employee;
import com.example.demo.auth.entity.*;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.auth.service.PositionAccessService;
import com.example.demo.base.entity.*;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.AccessScopeContext;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeArchiveTest {
 @Mock EmployeeRepository employeeRepository;@Mock UserRepository userRepository;@Mock PositionAccessService positionAccessService;
 @Mock CompanyRepository companyRepository;@Mock EntityManager entityManager;
 @InjectMocks EmployeeService service;
 Employee employee;User user;Company company;
 @BeforeEach void setup(){org.springframework.test.util.ReflectionTestUtils.setField(service,"entityManager",entityManager);company=new Company();company.setId(12L);employee=new Employee();employee.setId(3L);employee.setCompany(company);user=new User();user.setId(44L);employee.setUser(user);AccessScopeContext.set(new AccessScopeContext.ScopeData(1L,12L,UserRole.AccessScope.BRANCH,List.of(12L)));SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin",null,List.of(new SimpleGrantedAuthority("ROLE_HR_MANAGER"))));when(employeeRepository.findById(3L)).thenReturn(Optional.of(employee));}
 void account(){when(userRepository.findByIdForUpdate(44L)).thenReturn(Optional.of(user));}
 @AfterEach void clear(){AccessScopeContext.clear();SecurityContextHolder.clearContext();}
 @Test void archiveAndRestoreKeepLinkedAccountHoldAndRecords(){account();user.setLoginHeld(true);user.setActive(false);service.doDelete(3L);assertThat(employee.isActive()).isFalse();assertThat(employee.getUser()).isSameAs(user);service.doRestore(3L);assertThat(employee.isActive()).isTrue();assertThat(user.isLoginHeld()).isTrue();assertThat(user.isActive()).isFalse();verify(employeeRepository,never()).delete(any(Employee.class));verify(userRepository,never()).save(any());}
 @Test void ownEmployeeCannotBeArchived(){account();AccessScopeContext.set(new AccessScopeContext.ScopeData(44L,12L,UserRole.AccessScope.BRANCH,List.of(12L)));assertThatThrownBy(()->service.doDelete(3L)).hasMessageContaining("own employee");assertThat(employee.isActive()).isTrue();}
 @Test void platformAdministratorEmployeeCannotBeArchived(){account();var r=new Role();r.setName(Role.RoleName.PLATFORM_SUPER_ADMIN);var ur=new UserRole();ur.setRole(r);ur.setUser(user);user.getUserRoles().add(ur);assertThatThrownBy(()->service.doDelete(3L)).hasMessageContaining("Platform administrator");assertThat(employee.isActive()).isTrue();}
 @Test void foreignCompanyEmployeeCannotBeArchived(){company.setId(99L);assertThatThrownBy(()->service.doDelete(3L)).isInstanceOf(com.example.demo.common.exception.ResourceNotFoundException.class);verifyNoInteractions(userRepository);}
 @Test void employeeWithoutLoginCanBeArchivedAndRestored(){employee.setUser(null);service.doDelete(3L);assertThat(employee.isActive()).isFalse();service.doRestore(3L);assertThat(employee.isActive()).isTrue();}
 @Test void restoringRequiresAvailablePlanCapacity(){account();employee.setActive(false);var org=new Organization();org.setSubscriptionPlan(com.example.demo.base.enums.SubscriptionPlan.FREE);company.setOrganization(org);when(companyRepository.findByOrganizationId(org.getId())).thenReturn(List.of(company));when(employeeRepository.countByCompanyIdAndIsActiveTrue(12L)).thenReturn(20L);assertThatThrownBy(()->service.doRestore(3L)).hasMessageContaining("Employee limit");assertThat(employee.isActive()).isFalse();}
}
