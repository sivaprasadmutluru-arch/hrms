package com.example.demo.attendance.service;

import com.example.demo.base.entity.Company;
import com.example.demo.employee.entity.Employee;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.repository.LeaveRequestRepository;
import com.example.demo.leave.service.LeaveService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.data.jpa.domain.Specification;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReportingTeamWorkspaceServiceTest {
    private final ReportingTeamAttendanceService team = mock(ReportingTeamAttendanceService.class);
    private final LeaveRequestRepository leaves = mock(LeaveRequestRepository.class);
    private final LeaveService workflow = mock(LeaveService.class);
    private final ReportingTeamWorkspaceService service = new ReportingTeamWorkspaceService(team, leaves, workflow);

    private Employee report(long id, long companyId, String name) {
        Company company = new Company(); company.setId(companyId); company.setName("Company " + companyId);
        Employee employee = new Employee(); employee.setId(id); employee.setFirstName(name); employee.setCompany(company);
        return employee;
    }
    private LeaveRequest request(Employee employee) {
        LeaveRequest request = new LeaveRequest(); request.setId(7L); request.setEmployee(employee);
        request.setCompany(employee.getCompany()); request.setStatus(LeaveRequest.LeaveStatus.REQUESTED);
        when(leaves.findById(7L)).thenReturn(Optional.of(request));
        when(leaves.findByIdForTeamReview(7L)).thenReturn(Optional.of(request));
        return request;
    }

    @Test void rosterIncludesEveryDirectReportEvenWithoutAttendanceOrLeave() {
        when(team.directReports(166L)).thenReturn(List.of(report(2,64,"Bilal"), report(1,64,"Amina")));
        var result = service.employees(166L);
        assertEquals(List.of("Amina", "Bilal"), result.stream().map(ReportingTeamWorkspaceService.TeamMember::fullName).toList());
        assertEquals(64L, result.get(0).companyId());
        verifyNoInteractions(leaves, workflow);
    }
    @Test void noReportsMeansNoLeaveQuery() {
        when(team.directReports(166L)).thenReturn(List.of());
        assertTrue(service.leaves(166L).isEmpty());
        verifyNoInteractions(leaves, workflow);
    }
    @Test void leaveHistoryCarriesServerReviewPermission() {
        Employee employee = report(1,64,"Amina");
        when(team.directReports(166L)).thenReturn(List.of(employee));
        LeaveRequest request = request(employee);
        when(leaves.findAll(org.mockito.ArgumentMatchers.<Specification<LeaveRequest>>any())).thenReturn(List.of(request));
        when(workflow.reviewAllowed(7L)).thenReturn(true);
        assertTrue(service.leaves(166L).get(0).canReview());
    }
    @Test void unrelatedOrFormerReportsCannotBeApproved() {
        when(team.directReports(166L)).thenReturn(List.of());
        request(report(99,64,"Unrelated"));
        assertThrows(AccessDeniedException.class, () -> service.decideLeave(166L,7L,null,true));
        verifyNoInteractions(workflow);
    }
    @Test void employeeIdCollisionAcrossCompaniesCannotBeReviewed() {
        when(team.directReports(166L)).thenReturn(List.of(report(1,64,"Amina")));
        request(report(1,65,"Other tenant"));
        assertThrows(AccessDeniedException.class, () -> service.decideLeave(166L,7L,"No",false));
        verifyNoInteractions(workflow);
    }
    @Test void serverDeniedDecisionIsNotForwardedToWorkflow() {
        Employee employee = report(1,64,"Amina");
        when(team.directReports(166L)).thenReturn(List.of(employee));
        request(employee);
        when(workflow.reviewAllowed(7L)).thenReturn(false);
        assertThrows(AccessDeniedException.class, () -> service.decideLeave(166L,7L,null,true));
        verify(workflow,never()).approve(anyLong(),anyLong());
    }
    @Test void allowedApprovalsAndRejectionsUseExistingWorkflow() {
        Employee employee = report(1,64,"Amina");
        when(team.directReports(166L)).thenReturn(List.of(employee));
        LeaveRequest request = request(employee);
        when(workflow.reviewAllowed(7L)).thenReturn(true);
        when(workflow.approve(7L,166L)).thenReturn(request);
        when(workflow.reject(7L,"Dates incorrect")).thenReturn(request);
        assertFalse(service.decideLeave(166L,7L,null,true).canReview());
        service.decideLeave(166L,7L,"Dates incorrect",false);
        verify(workflow).approve(7L,166L);
        verify(workflow).reject(7L,"Dates incorrect");
    }

    @Test void completedRequestsAndBlankRejectionsAreBlocked() {
        Employee employee = report(1,64,"Amina");
        when(team.directReports(166L)).thenReturn(List.of(employee));
        LeaveRequest request = request(employee);
        when(workflow.reviewAllowed(7L)).thenReturn(true);
        assertThrows(com.example.demo.common.exception.BadRequestException.class,
                () -> service.decideLeave(166L,7L," ",false));
        request.setStatus(LeaveRequest.LeaveStatus.APPROVED);
        assertThrows(com.example.demo.common.exception.BadRequestException.class,
                () -> service.decideLeave(166L,7L,"Changed mind",false));
        verify(workflow,never()).reject(anyLong(),any());
    }
}
