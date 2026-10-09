package com.example.demo.leave.service;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.service.ReportingManagerService;
import com.example.demo.leave.entity.AvailableLeave;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.entity.LeaveType;
import com.example.demo.leave.repository.AvailableLeaveRepository;
import com.example.demo.leave.repository.LeaveRequestRepository;
import com.example.demo.leave.repository.LeaveTypeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveApplicationDateTest {
    @Mock LeaveTypeRepository types;
    @Mock LeaveRequestRepository requests;
    @Mock AvailableLeaveRepository balances;
    @Mock EmployeeRepository employees;
    @Mock CompanyRepository companies;
    @Mock ReportingManagerService managers;
    @Spy @InjectMocks LeaveService service;

    @ParameterizedTest
    @CsvSource({"2026-10-07,2026-08-07", "2026-04-30,2026-02-28", "2024-04-30,2024-02-29", "2026-01-31,2025-11-30"})
    void inclusiveCalendarMonthCutoffHandlesMonthEndsAndLeapYears(LocalDate today, LocalDate cutoff) {
        assertDoesNotThrow(() -> LeaveService.validateApplicationDates(cutoff, cutoff, today));
        assertThrows(BadRequestException.class,
                () -> LeaveService.validateApplicationDates(cutoff.minusDays(1), cutoff, today));
        assertDoesNotThrow(() -> LeaveService.validateApplicationDates(today, today, today));
        assertDoesNotThrow(() -> LeaveService.validateApplicationDates(today.plusMonths(3), today.plusMonths(3), today));
    }

    @Test
    void invalidRangesAndMissingDatesStillFail() {
        LocalDate today = LocalDate.of(2026, 10, 7);
        assertThrows(BadRequestException.class, () -> LeaveService.validateApplicationDates(today, today.minusDays(1), today));
        assertThrows(BadRequestException.class, () -> LeaveService.validateApplicationDates(null, today, today));
        assertThrows(BadRequestException.class, () -> LeaveService.validateApplicationDates(today, null, today));
    }

    @Test
    void tooOldApplicationFailsBeforeAnyBalanceOrRequestChanges() {
        LocalDate date = LocalDate.now().minusMonths(2).minusDays(1);
        assertThrows(BadRequestException.class, () -> service.applyLeave(1L, 2L, date, date, "Past leave", 3L));
        verifyNoInteractions(types, requests, balances, employees, companies, managers);
    }

    @Test
    void pastHalfDayRetainsApprovalWorkflowAndBalanceValidation() {
        LocalDate date = LocalDate.now().minusMonths(1);
        LeaveType type = new LeaveType();
        type.setId(2L);
        type.setLeaveValidationType(LeaveType.LeaveValidationType.MANAGER_VALIDATION);
        AvailableLeave balance = new AvailableLeave();
        balance.setLeaveType(type);
        balance.setAvailableDays(10.0);
        balance.setCarryforwardDays(0.0);
        when(types.findById(2L)).thenReturn(Optional.of(type));
        when(balances.findByEmployeeIdAndLeaveTypeId(1L, 2L)).thenReturn(Optional.of(balance));
        when(employees.findById(1L)).thenReturn(Optional.of(new Employee()));
        when(companies.findById(3L)).thenReturn(Optional.of(new Company()));
        when(requests.save(any(LeaveRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doReturn(1.0).when(service).calculateWorkingDays(date, date, 3L, type, 1L);

        LeaveRequest saved = service.applyLeave(1L, 2L, date, date, "Past leave", 3L, LeaveRequest.LeaveDuration.FIRST_HALF);
        assertEquals(date, saved.getStartDate());
        assertEquals(0.5, saved.getRequestedDays());
        assertEquals(LeaveRequest.LeaveStatus.REQUESTED, saved.getStatus());
        assertEquals(10.0, balance.getAvailableDays());

        balance.setAvailableDays(0.0);
        assertThrows(BadRequestException.class,
                () -> service.applyLeave(1L, 2L, date, date, "Past leave", 3L, LeaveRequest.LeaveDuration.FIRST_HALF));
        verify(requests, times(1)).save(any(LeaveRequest.class));
    }
}
