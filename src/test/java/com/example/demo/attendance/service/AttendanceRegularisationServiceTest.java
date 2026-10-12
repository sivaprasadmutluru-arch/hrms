package com.example.demo.attendance.service;

import com.example.demo.attendance.dto.RegularisationSubmitRequest;
import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.entity.AttendanceRegularisationRequest;
import com.example.demo.attendance.repository.AttendanceRegularisationRequestRepository;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.entity.User;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.ShiftSchedule;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.notification.service.NotificationService;
import com.example.demo.common.exception.BadRequestException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceRegularisationServiceTest {

    @Mock AttendanceRegularisationRequestRepository requestRepository;
    @Mock AttendanceRepository attendanceRepository;
    @Mock EmployeeRepository employeeRepository;
    @Mock UserRoleRepository userRoleRepository;
    @Mock AttendanceService attendanceService;
    @Mock NotificationService notificationService;
    @InjectMocks AttendanceRegularisationService service;

    @AfterEach
    void clearScope() {
        AccessScopeContext.clear();
    }

    @Test
    void submitRequestSucceedsWithoutReportingManager() {
        Employee employee = employee(10L);
        // Note: no reporting manager is set on this employee anywhere -
        // the old workflow required one and threw BadRequestException here.
        Company company = new Company();
        company.setId(5L);
        ShiftSchedule shift = new ShiftSchedule();
        shift.setStartTime(LocalTime.of(9, 0));
        Attendance attendance = new Attendance();
        attendance.setId(1L);
        attendance.setEmployee(employee);
        attendance.setCompany(company);
        attendance.setAttendanceStatus(Attendance.AttendanceQualityStatus.IRREGULAR);
        attendance.setShift(shift);
        attendance.setCheckIn(LocalTime.of(9, 30));

        when(employeeRepository.findByUserId(100L)).thenReturn(Optional.of(employee));
        when(attendanceRepository.findById(1L)).thenReturn(Optional.of(attendance));
        when(requestRepository.findByAttendanceId(1L)).thenReturn(List.of());
        when(userRoleRepository.findByCompanyIdAndRoleName(any(), any())).thenReturn(List.of());
        when(requestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RegularisationSubmitRequest req = new RegularisationSubmitRequest();
        req.setAttendanceId(1L);
        req.setRequestType("LATE_ARRIVAL");
        req.setReason("Traffic");

        assertDoesNotThrow(() -> {
            var dto = service.submitRequest(req, 100L);
            assertEquals("PENDING", dto.getStatus());
        });
    }

    @Test
    void companyListsRejectOutOfScopeCompany() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(
                1L, 5L, UserRole.AccessScope.BRANCH, List.of(5L)));

        assertThrows(AccessDeniedException.class, () -> service.getAllForCompany(99L));
    }

    @Test
    void employeeCannotReadAnotherEmployeesRequest() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(
                1L, 5L, UserRole.AccessScope.SELF, List.of(5L)));
        AttendanceRegularisationRequest request = request(3L,
                AttendanceRegularisationRequest.RequestStatus.PENDING);
        Employee owner = employee(30L);
        User ownerUser = new User();
        ownerUser.setId(2L);
        owner.setUser(ownerUser);
        request.setEmployee(owner);
        when(requestRepository.findById(3L)).thenReturn(Optional.of(request));

        assertThrows(AccessDeniedException.class, () -> service.getById(3L));
    }

    @Test
    void regularisationAllowsExactlyOneMonthButRejectsOlderAndFutureDates() {
        LocalDate today = LocalDate.of(2026, 10, 10);

        assertDoesNotThrow(() -> AttendanceRegularisationService.validateRequestDate(
                LocalDate.of(2026, 9, 10), today));
        assertThrows(BadRequestException.class, () -> AttendanceRegularisationService.validateRequestDate(
                LocalDate.of(2026, 9, 9), today));
        assertThrows(BadRequestException.class, () -> AttendanceRegularisationService.validateRequestDate(
                LocalDate.of(2026, 10, 11), today));
    }

    private AttendanceRegularisationRequest request(
            Long id, AttendanceRegularisationRequest.RequestStatus status) {
        Company company = new Company();
        company.setId(5L);
        AttendanceRegularisationRequest request = new AttendanceRegularisationRequest();
        request.setId(id);
        request.setStatus(status);
        request.setCompany(company);
        return request;
    }

    private Employee employee(Long id) {
        Employee employee = new Employee();
        employee.setId(id);
        return employee;
    }
}
