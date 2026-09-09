package com.example.demo.auth.service;

import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.base.entity.Company;
import com.example.demo.common.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmployeeCompanyGuardTest {
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    UserRoleRepository roles = mock(UserRoleRepository.class);
    EmployeeCompanyGuard guard = spy(new EmployeeCompanyGuard(jdbc, roles));

    UserRole role(long company, UserRole.AccessScope scope) {
        Company c = new Company(); c.setId(company);
        UserRole r = new UserRole(); r.setId(company); r.setCompany(c); r.setAccessScope(scope); return r;
    }

    @Test void prefersLinkedCompanyForEqualScopesRegardlessOfOrder() {
        doReturn(new HashSet<>(Set.of(55L))).when(guard).linkedCompanies(131L);
        UserRole wrong = role(5, UserRole.AccessScope.SELF), right = role(55, UserRole.AccessScope.SELF);
        when(roles.findByUserId(131L)).thenReturn(List.of(wrong,right), List.of(right,wrong));
        assertThat(guard.primaryRole(131L)).isSameAs(right);
        assertThat(guard.primaryRole(131L)).isSameAs(right);
    }
    @Test void preservesExplicitHigherScopeAdministratorAssignment() {
        doReturn(Set.of(55L)).when(guard).linkedCompanies(131L);
        UserRole admin = role(5, UserRole.AccessScope.ENTERPRISE);
        when(roles.findByUserId(131L)).thenReturn(List.of(role(55,UserRole.AccessScope.SELF),admin));
        assertThat(guard.primaryRole(131L)).isSameAs(admin);
    }
    @Test void rejectsCrossOrganizationEmployment() {
        doReturn(new HashSet<>(Set.of(55L))).when(guard).linkedCompanies(131L);
        when(jdbc.queryForObject(anyString(), eq(Long.class), eq(5L))).thenReturn(1L);
        when(jdbc.queryForObject(anyString(), eq(Long.class), eq(55L))).thenReturn(2L);
        assertThatThrownBy(() -> guard.validateEmployment(131L,5L)).isInstanceOf(BadRequestException.class);
    }
    @Test void permitsSameOrganizationBranchAssignment() {
        doReturn(new HashSet<>(Set.of(55L))).when(guard).linkedCompanies(131L);
        when(jdbc.queryForObject(anyString(), eq(Long.class), anyLong())).thenReturn(2L);
        assertThatCode(() -> guard.validateEmployment(131L,56L)).doesNotThrowAnyException();
    }
}
