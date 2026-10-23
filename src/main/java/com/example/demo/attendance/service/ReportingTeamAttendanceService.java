package com.example.demo.attendance.service;

import com.example.demo.attendance.dto.AttendanceResponse;
import com.example.demo.attendance.dto.RegularisationRequestDto;
import com.example.demo.attendance.entity.AttendanceRegularisationRequest;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.attendance.repository.AttendanceRegularisationRequestRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.service.ReportingManagerService;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Relationship-based access; never widens a caller's role or company scope. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportingTeamAttendanceService {
    private final EmployeeRepository employees;
    private final ReportingManagerService reportingManagers;
    private final AttendanceRepository attendance;
    private final AttendanceRegularisationRequestRepository requests;
    private final AttendanceRegularisationService regularisation;

    private Employee manager(Long userId) {
        Employee employee = employees.findByUserId(userId)
                .orElseThrow(() -> new AccessDeniedException("An active employee profile is required"));
        var scope = AccessScopeContext.get();
        Long companyId = employee.getCompany().getId();
        if (!employee.isActive() || scope == null || !userId.equals(scope.getUserId())
                || !scope.canAccess(companyId)
                || (scope.getCompanyId() != null && !companyId.equals(scope.getCompanyId()))
                || (scope.getFilterCompanyId() != null && !companyId.equals(scope.getFilterCompanyId()))) {
            throw new AccessDeniedException("You cannot access this company's team attendance");
        }
        return employee;
    }

    public List<AttendanceResponse> attendance(Long userId, LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 366)
            throw new BadRequestException("Select an attendance date range of up to one year");
        Employee manager = manager(userId);
        List<Long> ids = reportingManagers.directReports(manager).stream().map(Employee::getId).toList();
        if (ids.isEmpty()) return List.of();
        return attendance.findByCompanyIdAndEmployeeIdInAndAttendanceDateBetween(
                manager.getCompany().getId(), ids, from, to).stream().map(AttendanceResponse::from).toList();
    }

    public List<RegularisationRequestDto> requests(Long userId) {
        Employee manager = manager(userId);
        List<Long> ids = reportingManagers.directReports(manager).stream().map(Employee::getId).toList();
        if (ids.isEmpty()) return List.of();
        return requests.findAll((root, query, cb) -> cb.and(
                cb.equal(root.get("company").get("id"), manager.getCompany().getId()),
                root.get("employee").get("id").in(ids))).stream()
                .map(request -> {
                    RegularisationRequestDto dto = RegularisationRequestDto.from(request);
                    dto.setCanReview(request.getStatus() == AttendanceRegularisationRequest.RequestStatus.PENDING);
                    return dto;
                }).toList();
    }

    /** Re-evaluated on every decision, including after a reporting manager changes. */
    public void requireDirectReportRequest(Long userId, Long requestId) {
        Employee manager = manager(userId);
        AttendanceRegularisationRequest request = requests.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("RegularisationRequest", requestId));
        boolean matches = request.getCompany().getId().equals(manager.getCompany().getId())
                && reportingManagers.directReports(manager).stream()
                    .anyMatch(report -> report.getId().equals(request.getEmployee().getId()));
        if (!matches) throw new AccessDeniedException("Only your direct reports' requests can be reviewed");
    }

    @Transactional
    public RegularisationRequestDto decide(Long userId, Long requestId, String remarks, boolean approve) {
        requireDirectReportRequest(userId, requestId);
        return approve ? regularisation.approve(requestId, remarks, userId)
                : regularisation.reject(requestId, remarks, userId);
    }
}
