package com.example.demo.attendance.service;

import com.example.demo.employee.entity.Employee;
import com.example.demo.leave.dto.LeaveMapper;
import com.example.demo.leave.dto.LeaveRequestDTO;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.repository.LeaveRequestRepository;
import com.example.demo.leave.service.LeaveService;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.exception.BadRequestException;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportingTeamWorkspaceService {
    private final ReportingTeamAttendanceService team;
    private final LeaveRequestRepository leaves;
    private final LeaveService leaveService;

    public record TeamMember(Long id, String fullName, String badgeId, String departmentName,
                             String jobPositionName, Long companyId, String companyName) {}

    public List<TeamMember> employees(Long userId) {
        return team.directReports(userId).stream().map(employee -> new TeamMember(
                employee.getId(), name(employee), employee.getBadgeId(),
                employee.getDepartment() == null ? null : employee.getDepartment().getName(),
                employee.getJobPosition() == null ? null : employee.getJobPosition().getName(),
                employee.getCompany().getId(), employee.getCompany().getName()))
                .sorted(Comparator.comparing(TeamMember::fullName, String.CASE_INSENSITIVE_ORDER)).toList();
    }

    private String name(Employee employee) {
        return ((employee.getFirstName() == null ? "" : employee.getFirstName()) + " "
                + (employee.getLastName() == null ? "" : employee.getLastName())).trim();
    }

    public List<LeaveRequestDTO> leaves(Long userId) {
        List<Employee> reports = team.directReports(userId);
        if (reports.isEmpty()) return List.of();
        var ids = reports.stream().map(Employee::getId).toList();
        Long companyId = reports.get(0).getCompany().getId();
        return leaves.findAll((root, query, cb) -> cb.and(
                cb.equal(root.get("company").get("id"), companyId),
                root.get("employee").get("id").in(ids))).stream()
                .sorted(Comparator.comparing((LeaveRequest request) -> request.getStatus() != LeaveRequest.LeaveStatus.REQUESTED)
                        .thenComparing(LeaveRequest::getId, Comparator.reverseOrder()))
                .map(request -> LeaveMapper.toDTO(request, leaveService.reviewAllowed(request.getId()))).toList();
    }

    @Transactional
    public LeaveRequestDTO decideLeave(Long userId, Long id, String reason, boolean approve) {
        List<Employee> reports = team.directReports(userId);
        LeaveRequest request = leaves.findByIdForTeamReview(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", id));
        boolean directReport = reports.stream().anyMatch(employee ->
                request.getEmployee() != null && employee.getId().equals(request.getEmployee().getId())
                && employee.getCompany().getId().equals(request.getCompany().getId()));
        if (!directReport || !leaveService.reviewAllowed(id))
            throw new AccessDeniedException("Only permitted direct report leave requests can be reviewed");
        if (request.getStatus() != LeaveRequest.LeaveStatus.REQUESTED)
            throw new BadRequestException("This leave request is no longer pending. Refresh your team.");
        if (!approve && (reason == null || reason.isBlank()))
            throw new BadRequestException("Rejection reason is required");
        LeaveRequest saved = approve ? leaveService.approve(id, userId) : leaveService.reject(id, reason);
        return LeaveMapper.toDTO(saved, false);
    }
}
