package com.example.demo.onboarding.service;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.entity.*;
import com.example.demo.leave.repository.*;
import com.example.demo.leave.service.LeavePeriodResolver;
import com.example.demo.onboarding.entity.*;
import com.example.demo.onboarding.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProbationConfirmationServiceTest {
    @Mock ProbationPolicyRepository policies;
    @Mock ProbationConfirmationRepository confirmations;
    @Mock ProbationEligibility eligibility;
    @Mock EmployeeRepository employees;
    @Mock CompanyRepository companies;
    @Mock LeaveTypeRepository types;
    @Mock AvailableLeaveRepository balances;
    @Mock LeaveAllocationRepository allocations;
    @InjectMocks ProbationConfirmationService service;
    Employee employee;
    Company company;
    ProbationPolicy policy;
    final LocalDate joined = LocalDate.of(2026, 4, 22), due = joined.plusMonths(6);

    @BeforeEach void setup() {
        company = new Company(); company.setId(1L);
        employee = new Employee(); employee.setId(2L); employee.setCompany(company); employee.setDateJoining(joined);
        policy = new ProbationPolicy(); policy.setCompanyId(1L); policy.setEnabled(true); policy.setEffectiveFrom(joined);
        when(employees.findByIdForProbationConfirmation(2L)).thenReturn(Optional.of(employee));
    }
    void covered() {
        when(policies.findByCompanyId(1L)).thenReturn(Optional.of(policy));
        when(eligibility.joiningDate(employee)).thenReturn(joined);
        when(eligibility.applies(policy, joined)).thenReturn(true);
    }
    LeaveType type(boolean monthly) {
        LeaveType type = new LeaveType(); type.setId(3L); type.setCompany(company); type.setTotalDays(30); type.setAccrualEnabled(monthly);
        when(types.findAll()).thenReturn(List.of(type));
        when(eligibility.applicableCategory(employee, type)).thenReturn(true);
        return type;
    }
    @Test void doesNotConfirmBeforeSixMonthAnniversary() {
        covered(); assertFalse(service.confirmIfDue(2L, due.minusDays(1)));
        verifyNoInteractions(types, balances, allocations);
    }
    @Test void confirmsOnAnniversaryAndAllocatesUpfrontOnlyOnce() {
        covered(); type(false);
        assertTrue(service.confirmIfDue(2L, due));
        ArgumentCaptor<ProbationConfirmation> saved = ArgumentCaptor.forClass(ProbationConfirmation.class);
        verify(confirmations).save(saved.capture());
        assertEquals(due, saved.getValue().getConfirmedOn());
        verify(balances).save(argThat(b -> b.getAvailableDays() == 30));
        verify(allocations).save(argThat(a -> a.getTotalLeaveDays() == 30));
        when(confirmations.findByEmployeeId(2L)).thenReturn(Optional.of(saved.getValue()));
        assertFalse(service.confirmIfDue(2L, due.plusDays(1)));
        verify(confirmations, times(1)).save(any());
    }
    @Test void lateProcessingKeepsOriginalEffectiveDate() {
        covered(); type(false); assertTrue(service.confirmIfDue(2L, due.plusDays(9)));
        verify(confirmations).save(argThat(c -> c.getConfirmedOn().equals(due) && c.getProcessedOn().equals(due.plusDays(9))));
    }
    @Test void monthlyPolicyDoesNotGrantWholeAnnualEntitlement() {
        covered(); type(true); assertTrue(service.confirmIfDue(2L, due));
        verify(balances).save(argThat(b -> b.getAvailableDays() == 0));
        verify(allocations, never()).save(any());
    }
    @Test void existingImportedBalanceIsPreserved() {
        covered(); type(false);
        when(balances.findByEmployeeIdAndLeaveTypeId(2L, 3L)).thenReturn(Optional.of(new AvailableLeave()));
        assertTrue(service.confirmIfDue(2L, due)); verify(balances, never()).save(any());
        verifyNoInteractions(allocations);
    }
    @Test void inactiveEmployeesAreSkipped() {
        employee.setActive(false); assertFalse(service.confirmIfDue(2L, due)); verifyNoInteractions(policies, balances);
    }
    @Test void otherCompanyLeaveTypesAreNotAllocated() {
        covered(); Company other = new Company(); other.setId(99L);
        LeaveType type = new LeaveType(); type.setCompany(other);
        when(types.findAll()).thenReturn(List.of(type));
        assertTrue(service.confirmIfDue(2L, due)); verifyNoInteractions(balances, allocations);
    }
    @Test void monthEndJoiningUsesCalendarMonthsIncludingLeapYear() {
        LocalDate leapJoining = LocalDate.of(2023, 8, 31);
        when(policies.findByCompanyId(1L)).thenReturn(Optional.of(policy));
        when(eligibility.joiningDate(employee)).thenReturn(leapJoining);
        when(eligibility.applies(policy, leapJoining)).thenReturn(true);
        assertTrue(service.confirmIfDue(2L, LocalDate.of(2024, 2, 29)));
        verify(confirmations).save(argThat(c -> c.getConfirmedOn().equals(LocalDate.of(2024, 2, 29))));
    }
}
