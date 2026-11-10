package com.example.demo.auth.service;
import com.example.demo.auth.entity.*;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.entity.Company;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeArchiveGuardTest {
 @Mock JdbcTemplate jdbc;
 User account;EmployeeArchiveGuard guard;
 @BeforeEach void setup(){guard=new EmployeeArchiveGuard(jdbc);account=new User();account.setId(44L);account.setUsername("staff");account.setPassword("fixture");}
 void assignment(String schema,Role.RoleName name){var c=new Company();c.setId(12L);c.setSchemaName(schema);var role=new Role();role.setName(name);var ur=new UserRole();ur.setCompany(c);ur.setUser(account);ur.setRole(role);account.getUserRoles().add(ur);}
 void available(){when(jdbc.queryForList(anyString(),eq(String.class),any(Object[].class))).thenReturn(List.of("tenant_one"));}
 @Test void archivedTenantEmployeeDisablesAuthentication(){assignment("tenant_one",Role.RoleName.EMPLOYEE);available();when(jdbc.queryForObject(anyString(),eq(Boolean.class),eq(44L))).thenReturn(true);assertThat(guard.isArchived(account)).isTrue();var principal=new UserPrincipal(account,List.of());principal.setEmploymentArchived(guard.isArchived(account));assertThat(principal.isEnabled()).isFalse();verify(jdbc,atLeastOnce()).queryForObject(contains("\"tenant_one\".employees"),eq(Boolean.class),eq(44L));}
 @Test void restoreDoesNotRemoveSeparateHold(){assignment("tenant_one",Role.RoleName.EMPLOYEE);available();when(jdbc.queryForObject(anyString(),eq(Boolean.class),eq(44L))).thenReturn(false);account.setLoginHeld(true);var principal=new UserPrincipal(account,List.of());principal.setEmploymentArchived(guard.isArchived(account));assertThat(principal.isEnabled()).isFalse();}
 @Test void restoredActiveEmployeeCanAuthenticate(){assignment("tenant_one",Role.RoleName.EMPLOYEE);available();when(jdbc.queryForObject(anyString(),eq(Boolean.class),eq(44L))).thenReturn(false);var principal=new UserPrincipal(account,List.of());principal.setEmploymentArchived(guard.isArchived(account));assertThat(principal.isEnabled()).isTrue();}
 @Test void platformAccountIsExempt(){assignment("tenant_one",Role.RoleName.PLATFORM_SUPER_ADMIN);assertThat(guard.isArchived(account)).isFalse();verifyNoInteractions(jdbc);}
 @Test void unrelatedSchemasCannotInfluenceAccount(){assignment("tenant_one",Role.RoleName.EMPLOYEE);when(jdbc.queryForList(anyString(),eq(String.class),any(Object[].class))).thenReturn(List.of("foreign_tenant"));assertThat(guard.isArchived(account)).isFalse();verify(jdbc,never()).queryForObject(anyString(),eq(Boolean.class),anyLong());}
 @Test void legacySchemaWithoutRequiredColumnsDoesNotBreakLogin(){assignment("tenant_one",Role.RoleName.EMPLOYEE);when(jdbc.queryForList(anyString(),eq(String.class),any(Object[].class))).thenReturn(List.of());assertThat(guard.isArchived(account)).isFalse();}
}
