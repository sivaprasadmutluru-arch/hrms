package com.example.demo.attendance.service;

import com.example.demo.attendance.entity.EmployeeAttendancePolicy;
import com.example.demo.attendance.repository.EmployeeAttendancePolicyRepository;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.base.entity.Company;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import org.junit.jupiter.api.*;
import org.springframework.security.access.AccessDeniedException;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmployeeAttendancePolicyServiceTest {
    final EmployeeAttendancePolicyRepository repository = mock(EmployeeAttendancePolicyRepository.class);
    final EmployeeRepository employees = mock(EmployeeRepository.class);
    final EmployeeAttendancePolicyService service = new EmployeeAttendancePolicyService(repository, employees);
    final LocalDate today = EmployeeAttendancePolicyService.today();
    final Employee employee = new Employee();
    @BeforeEach void setup() {
        Company company = new Company(); company.setId(10L); employee.setId(1L); employee.setCompany(company);
        when(employees.findById(1L)).thenReturn(Optional.of(employee));
        AccessScopeContext.set(new AccessScopeContext.ScopeData(9L,10L,UserRole.AccessScope.ENTERPRISE,List.of(10L)));
    }
    @AfterEach void clear() {AccessScopeContext.clear();}
    EmployeeAttendancePolicy entry(long id, LocalDate date, boolean required) {
        var value = new EmployeeAttendancePolicy(); value.setId(id); value.setEmployeeId(1L); value.setCompanyId(10L);
        value.setEffectiveFrom(date); value.setAttendanceRequired(required); return value;
    }
    @Test void defaultIsRequiredWithoutRoleOrTitleExceptions() {
        assertTrue(new EmployeeAttendancePolicyService.PolicyIndex(List.of()).required(1L,today));
    }
    @Test void changesAreEffectiveDatedAndRestorationPreservesHistory() {
        var index = new EmployeeAttendancePolicyService.PolicyIndex(List.of(entry(1,today,false),entry(2,today.plusDays(10),true)));
        assertTrue(index.required(1L,today.minusDays(1)));
        assertFalse(index.required(1L,today));
        assertFalse(index.required(1L,today.plusDays(9)));
        assertTrue(index.required(1L,today.plusDays(10)));
        assertTrue(index.required(2L,today));
    }
    @Test void latestSameDayDecisionWinsWithoutDeletingAuditHistory() {
        var index = new EmployeeAttendancePolicyService.PolicyIndex(List.of(entry(1,today,false),entry(3,today,true),entry(2,today,false)));
        assertTrue(index.required(1L,today));
    }
    @Test void companyScopeAndSelectedCompanyAreEnforced() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(9L,99L,UserRole.AccessScope.BRANCH,List.of(99L)));
        assertThrows(AccessDeniedException.class, () -> service.view(1L));
        AccessScopeContext.set(new AccessScopeContext.ScopeData(9L,10L,UserRole.AccessScope.ENTERPRISE,List.of(10L,99L),null,99L));
        assertThrows(AccessDeniedException.class, () -> service.view(1L));
        verifyNoInteractions(repository);
    }
    @Test void employeeCannotSelfExemptAndMissingScopeFailsClosed() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(9L,10L,UserRole.AccessScope.SELF,List.of(10L)));
        var change = new EmployeeAttendancePolicyService.Change(false,today,"Meeting-only role");
        assertThrows(AccessDeniedException.class, () -> service.change(1L,change,9L));
        AccessScopeContext.clear();
        assertThrows(AccessDeniedException.class, () -> service.change(1L,change,9L));
        verifyNoInteractions(repository);
    }
    @Test void requiresReasonAndRejectsBackdatingAndSpoofedAuthor() {
        assertThrows(BadRequestException.class, () -> service.change(1L,new EmployeeAttendancePolicyService.Change(false,today," "),9L));
        assertThrows(BadRequestException.class, () -> service.change(1L,new EmployeeAttendancePolicyService.Change(false,today.minusDays(1),"Executive"),9L));
        assertThrows(AccessDeniedException.class, () -> service.change(1L,new EmployeeAttendancePolicyService.Change(false,today,"Executive"),99L));
        verify(repository,never()).saveAndFlush(any());
    }
    @Test void appendsAuditableCompanyScopedPolicy() {
        when(repository.saveAndFlush(any())).thenAnswer(call -> {
            EmployeeAttendancePolicy entry = call.getArgument(0);
            assertEquals(1L,entry.getEmployeeId()); assertEquals(10L,entry.getCompanyId());
            assertEquals(9L,entry.getChangedByUserId()); assertEquals("Meeting-only role",entry.getReason());
            assertFalse(entry.isAttendanceRequired()); return entry;
        });
        service.change(1L,new EmployeeAttendancePolicyService.Change(false,today.plusDays(1)," Meeting-only role "),9L);
        verify(repository).saveAndFlush(any()); verify(repository,never()).delete(any());
    }
}
