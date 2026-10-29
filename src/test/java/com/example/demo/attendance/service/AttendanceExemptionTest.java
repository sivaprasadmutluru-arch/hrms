package com.example.demo.attendance.service;

import com.example.demo.attendance.entity.*;
import com.example.demo.attendance.repository.*;
import com.example.demo.base.entity.Company;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceExemptionTest {
    @Mock AttendanceRepository attendanceRepository;
    @Mock EmployeeRepository employees;
    @Mock LeaveRequestRepository leaves;
    @Mock HolidayRepository holidays;
    @Mock AttendanceRegularisationRequestRepository regularisations;
    @Mock EmployeeAttendancePolicyService policies;
    @InjectMocks AttendanceService service;
    final LocalDate day = LocalDate.of(2026,10,27);
    final Employee employee = new Employee();
    @BeforeEach void setup() {Company c=new Company(); c.setId(10L); employee.setId(1L); employee.setCompany(c); employee.setFirstName("Executive"); employee.setActive(true);}
    EmployeeAttendancePolicyService.PolicyIndex index(boolean required) {
        var policy = new EmployeeAttendancePolicy(); policy.setId(1L); policy.setEmployeeId(1L); policy.setCompanyId(10L);
        policy.setEffectiveFrom(day); policy.setAttendanceRequired(required);
        return new EmployeeAttendancePolicyService.PolicyIndex(List.of(policy));
    }
    @Test void fullViewShowsExemptionInsteadOfFabricatingAbsenceOrPresent() {
        when(employees.findById(1L)).thenReturn(Optional.of(employee));
        when(policies.index(eq(10L),anyList(),eq(day))).thenReturn(index(false));
        var rows=service.getFullView(10L,day,day,null,1L,null,PageRequest.of(0,20));
        assertEquals(1,rows.getTotalElements()); var row=rows.getContent().get(0);
        assertEquals("EXEMPT",row.getDisplayStatus()); assertFalse(row.isAttendanceRequired());
        assertNull(row.getId()); assertNull(row.getCheckIn()); assertNull(row.getWorkedHour());
        verify(attendanceRepository,never()).save(any());
    }
    @Test void normalEmployeesRemainAbsentAndHistoricalDatesRemainRequired() {
        when(employees.findById(1L)).thenReturn(Optional.of(employee));
        when(policies.index(eq(10L),anyList(),any())).thenReturn(index(false));
        var rows=service.getFullView(10L,day.minusDays(1),day.minusDays(1),null,1L,null,PageRequest.of(0,20));
        assertEquals("ABSENT",rows.getContent().get(0).getDisplayStatus());
    }
    @Test void exemptEmployeesAreNotInMissingPunchList() {
        when(employees.findByCompanyIdAndIsActiveTrue(10L)).thenReturn(List.of(employee));
        when(policies.index(eq(10L),anyList(),eq(day))).thenReturn(index(false));
        assertTrue(service.getNotClockedIn(10L,day).isEmpty());
    }
    @Test void statusEvaluationDoesNotCreateLateOrShortHoursDeductions() {
        Attendance attendance=new Attendance(); attendance.setEmployee(employee); attendance.setAttendanceDate(day);
        attendance.setDeductionMinutes(60); attendance.setDeductionAmount(100.0);
        when(policies.required(employee,day)).thenReturn(false);
        service.evaluateAttendanceStatus(attendance,0);
        assertEquals(0,attendance.getDeductionMinutes()); assertEquals(0.0,attendance.getDeductionAmount());
        verifyNoInteractions(attendanceRepository);
    }
    @Test void registerShowsExemptWithoutCountingAbsentOrPresent() {
        when(employees.findByCompanyIdAndIsActiveTrue(10L)).thenReturn(List.of(employee));
        when(policies.index(eq(10L),anyList(),any())).thenReturn(index(false));
        var register=service.getRegister(10L,null,2026,10);
        var row=register.getEmployees().get(0);
        assertEquals("EX",row.getDays().get(day.toString()).getDisplayStatus());
        assertEquals("exempt",row.getDays().get(day.toString()).getDayType());
        assertEquals(0,row.getPresentCount());
        // Dates before the exemption are still ordinary required dates.
        assertEquals("A",row.getDays().get(day.minusDays(1).toString()).getDisplayStatus());
    }
}
