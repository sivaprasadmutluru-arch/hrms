package com.example.demo.payroll.service;

import com.example.demo.attendance.entity.EmployeeAttendancePolicy;
import com.example.demo.attendance.repository.*;
import com.example.demo.attendance.service.EmployeeAttendancePolicyService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class PayrollAttendanceExemptionTest {
    @Mock AttendanceRepository attendance;
    @Mock AttendanceLateComeEarlyOutRepository late;
    @Mock EmployeeAttendancePolicyService policies;
    @InjectMocks PayrollService service;
    final LocalDate start=LocalDate.of(2026,10,26), end=start.plusDays(4);
    EmployeeAttendancePolicyService.PolicyIndex index(LocalDate from) {
        var policy=new EmployeeAttendancePolicy(); policy.setId(1L); policy.setEmployeeId(1L); policy.setEffectiveFrom(from); policy.setAttendanceRequired(false);
        return new EmployeeAttendancePolicyService.PolicyIndex(List.of(policy));
    }
    @Test void fullyExemptPeriodCreatesNoAttendanceDeductionsOrFakePresence() {
        when(policies.index(eq(10L),anyList(),eq(end))).thenReturn(index(start));
        var summary=service.attendanceSummary(1L,10L,start,end,Set.of(DayOfWeek.SATURDAY,DayOfWeek.SUNDAY));
        assertEquals(5,summary.exemptWorkingDays()); assertEquals(0,summary.deductionMinutes()); assertEquals(0,summary.late());
        assertEquals(0,summary.present()); verifyNoInteractions(attendance,late);
    }
    @Test void deductionsBeforeEffectiveDateAreRetained() {
        when(policies.index(eq(10L),anyList(),eq(end))).thenReturn(index(start.plusDays(2)));
        when(attendance.sumDeductionMinutesByEmployeeAndPeriod(anyLong(),any(),any())).thenReturn(15L);
        var summary=service.attendanceSummary(1L,10L,start,end,Set.of());
        assertEquals(3,summary.exemptWorkingDays()); assertEquals(30,summary.deductionMinutes());
        verify(attendance,never()).sumDeductionMinutesByEmployeeAndPeriod(1L,start.plusDays(2),start.plusDays(2));
    }
    @Test void ordinaryEmployeesKeepExistingPeriodAggregates() {
        when(policies.index(eq(10L),anyList(),eq(end))).thenReturn(new EmployeeAttendancePolicyService.PolicyIndex(List.of()));
        when(attendance.sumDeductionMinutesByEmployeeAndPeriod(1L,start,end)).thenReturn(60L);
        var summary=service.attendanceSummary(1L,10L,start,end,Set.of());
        assertEquals(0,summary.exemptWorkingDays()); assertEquals(60,summary.deductionMinutes());
        verify(attendance).sumDeductionMinutesByEmployeeAndPeriod(1L,start,end);
    }
}
