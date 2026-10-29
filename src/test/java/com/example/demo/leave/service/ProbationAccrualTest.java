package com.example.demo.leave.service;

import com.example.demo.base.entity.Company;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.entity.*;
import com.example.demo.leave.repository.*;
import com.example.demo.onboarding.service.ProbationEligibility;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProbationAccrualTest {
    @Mock LeaveTypeRepository types;
    @Mock AvailableLeaveRepository balances;
    @Mock LeaveAccrualLogRepository logs;
    @Mock EmployeeRepository employees;
    @Mock ProbationEligibility eligibility;
    @InjectMocks LeaveAccrualService service;
    Employee employee;
    LeaveType type;
    AvailableLeave balance;
    final LocalDate due = LocalDate.of(2026, 10, 16);
    @BeforeEach void setup() {
        Company company = new Company(); company.setId(1L);
        employee = new Employee(); employee.setId(2L); employee.setCompany(company); employee.setDateJoining(due.minusMonths(6));
        when(employees.findById(2L)).thenReturn(Optional.of(employee));
        when(eligibility.leaveStartsOn(employee)).thenReturn(due);
        type = new LeaveType(); type.setId(3L); type.setCompany(company); type.setTotalDays(30);
        type.setAccrualEnabled(true); type.setAccrualPrecision(2); type.setAccrualPostingTiming(LeaveType.AccrualPostingTiming.START_OF_MONTH);
        balance = new AvailableLeave(); balance.setEmployee(employee); balance.setLeaveType(type);
    }
    void ready() {
        when(types.findByAccrualEnabledTrue()).thenReturn(List.of(type));
        when(balances.findByLeaveTypeId(3L)).thenAnswer(i -> new ArrayList<>(List.of(balance)));
        when(eligibility.applicableCategory(employee, type)).thenReturn(true);
    }
    @Test void noAccrualBeforeConfirmationDate() {
        assertEquals(0, service.processProbationAccrual(2L, due.minusDays(1)));
        verifyNoInteractions(types, logs, balances);
    }
    @Test void firstMonthProratesFromConfirmationAndCannotDoubleCredit() {
        ready();
        assertEquals(1, service.processProbationAccrual(2L, due));
        assertEquals(1.29, balance.getAvailableDays());
        when(logs.existsByEmployeeIdAndLeaveTypeIdAndAccrualDate(2L, 3L, due.withDayOfMonth(1))).thenReturn(true);
        assertEquals(0, service.processProbationAccrual(2L, due.plusDays(1)));
        assertEquals(1.29, balance.getAvailableDays());
    }
    @Test void endOfMonthPolicyWaitsUntilMonthEnd() {
        type.setAccrualPostingTiming(LeaveType.AccrualPostingTiming.END_OF_MONTH);
        when(types.findByAccrualEnabledTrue()).thenReturn(List.of(type));
        assertEquals(0, service.processProbationAccrual(2L, due));
        verifyNoInteractions(logs, balances);
    }
    @Test void catchUpCreditsOnlyMonthsSinceConfirmation() {
        ready();
        assertEquals(2, service.processProbationAccrual(2L, LocalDate.of(2026, 11, 2)));
        assertEquals(3.79, balance.getAvailableDays(), 0.001);
    }
}
