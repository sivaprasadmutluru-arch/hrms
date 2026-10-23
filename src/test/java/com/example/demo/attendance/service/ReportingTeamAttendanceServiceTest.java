package com.example.demo.attendance.service;

import com.example.demo.attendance.entity.AttendanceRegularisationRequest;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.attendance.repository.AttendanceRegularisationRequestRepository;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.base.entity.Company;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.service.ReportingManagerService;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.springframework.security.access.AccessDeniedException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReportingTeamAttendanceServiceTest {
    private final EmployeeRepository employees = mock(EmployeeRepository.class);
    private final ReportingManagerService managers = mock(ReportingManagerService.class);
    private final AttendanceRepository attendance = mock(AttendanceRepository.class);
    private final AttendanceRegularisationRequestRepository requests = mock(AttendanceRegularisationRequestRepository.class);
    private final AttendanceRegularisationService regularisation = mock(AttendanceRegularisationService.class);
    private final ReportingTeamAttendanceService service = new ReportingTeamAttendanceService(
            employees, managers, attendance, requests, regularisation);
    private final Company company = new Company();
    private final Employee manager = new Employee();
    private final Employee report = new Employee();
    private final LocalDate date = LocalDate.of(2026, 10, 23);

    @BeforeEach void setup() {
        company.setId(65L);
        manager.setId(10L); manager.setActive(true); manager.setCompany(company);
        report.setId(11L); report.setActive(true); report.setCompany(company);
        when(employees.findByUserId(245L)).thenReturn(Optional.of(manager));
        when(managers.directReports(manager)).thenReturn(List.of(report));
        AccessScopeContext.set(new AccessScopeContext.ScopeData(245L, 65L, UserRole.AccessScope.SELF, List.of(65L)));
    }
    @AfterEach void cleanup() { AccessScopeContext.clear(); }

    @Test void attendanceQueryIsLimitedToDirectReportIdsAndSelectedCompany() {
        when(attendance.findByCompanyIdAndEmployeeIdInAndAttendanceDateBetween(65L, List.of(11L), date, date))
                .thenReturn(List.of());
        assertTrue(service.attendance(245L, date, date).isEmpty());
        verify(attendance).findByCompanyIdAndEmployeeIdInAndAttendanceDateBetween(65L, List.of(11L), date, date);
        verifyNoMoreInteractions(attendance);
    }

    @Test void ordinaryEmployeeHasNoTeamRecords() {
        when(managers.directReports(manager)).thenReturn(List.of());
        assertTrue(service.attendance(245L, date, date).isEmpty());
        assertTrue(service.requests(245L).isEmpty());
        verifyNoInteractions(attendance, requests);
    }

    @Test void wrongCompanyFilterIsDeniedBeforeReadingRecords() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(245L, 65L, UserRole.AccessScope.SELF, List.of(65L), null, 66L));
        assertThrows(AccessDeniedException.class, () -> service.attendance(245L, date, date));
        verifyNoInteractions(attendance);
    }

    @Test void missingScopeIsDenied() {
        AccessScopeContext.clear();
        assertThrows(AccessDeniedException.class, () -> service.requests(245L));
        verifyNoInteractions(requests);
    }

    private AttendanceRegularisationRequest request(Employee employee) {
        AttendanceRegularisationRequest request = new AttendanceRegularisationRequest();
        request.setId(7L); request.setCompany(company); request.setEmployee(employee);
        when(requests.findById(7L)).thenReturn(Optional.of(request));
        return request;
    }

    @Test void ownOrUnrelatedRequestsCannotBeApprovedOrRejected() {
        request(manager);
        assertThrows(AccessDeniedException.class, () -> service.decide(245L, 7L, null, true));
        Employee unrelated = new Employee(); unrelated.setId(99L);
        request(unrelated);
        assertThrows(AccessDeniedException.class, () -> service.decide(245L, 7L, "No", false));
        verifyNoInteractions(regularisation);
    }

    @Test void directReportDecisionUsesExistingApprovalAndRejectionWorkflow() {
        request(report);
        service.decide(245L, 7L, "Verified", true);
        verify(regularisation).approve(7L, "Verified", 245L);
        service.decide(245L, 7L, "Incorrect time", false);
        verify(regularisation).reject(7L, "Incorrect time", 245L);
    }

    @Test void reassignmentRevokesApprovalImmediately() {
        request(report);
        when(managers.directReports(manager)).thenReturn(List.of());
        assertThrows(AccessDeniedException.class, () -> service.decide(245L, 7L, null, true));
        verifyNoInteractions(regularisation);
    }
}
