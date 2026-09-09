package com.example.demo.leave.service;

import com.example.demo.auth.entity.UserRole;
import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.EmployeeTypeRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.entity.LeaveAllocation;
import com.example.demo.leave.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveServiceDeleteTest {
    @Mock ApplicationEventPublisherAdapter unusedPublisher;
    @Mock LeaveRequestRepository requestRepository;
    @Mock LeaveTypeRepository typeRepository;
    @Mock LeaveAllocationRepository allocationRepository;
    @Mock AvailableLeaveRepository availableRepository;
    @Mock HolidayRepository holidayRepository;
    @Mock HolidayAllocationRepository holidayAllocationRepository;
    @Mock CompanyLeaveRepository companyLeaveRepository;
    @Mock EmployeeRepository employeeRepository;
    @Mock CompanyRepository companyRepository;
    @Mock EmployeeTypeRepository employeeTypeRepository;
    @Mock LeaveRequestConditionApprovalRepository conditionRepository;
    @Mock LeaveRequestCommentRepository commentRepository;
    @Mock LeaveRequestFileRepository fileRepository;

    @InjectMocks LeaveService service;

    // Mockito resolves this interface to ApplicationEventPublisher without loading Spring.
    interface ApplicationEventPublisherAdapter extends org.springframework.context.ApplicationEventPublisher {}

    @AfterEach void clearScope() { AccessScopeContext.clear(); }

    private LeaveRequest request(long id, long companyId) {
        Company company = new Company(); company.setId(companyId);
        LeaveRequest request = new LeaveRequest(); request.setId(id); request.setCompany(company);
        return request;
    }

    private LeaveAllocation allocation(long id, long companyId) {
        Company company = new Company(); company.setId(companyId);
        LeaveAllocation allocation = new LeaveAllocation(); allocation.setId(id); allocation.setCompany(company);
        return allocation;
    }

    @Test void deletesOnlyAfterAllSelectedRequestsPassCompanyScopeValidation() {
        LeaveRequest first = request(10, 55), second = request(11, 55);
        when(requestRepository.findAllById(List.of(10L, 11L))).thenReturn(List.of(first, second));
        AccessScopeContext.set(new AccessScopeContext.ScopeData(1L, 55L,
                UserRole.AccessScope.BRANCH, List.of(55L)));

        assertThat(service.deleteRequests(List.of(10L, 11L))).isEqualTo(2);
        verify(requestRepository).deleteAll(List.of(first, second));
    }

    @Test void rejectsRequestFromAnotherCompanyWithoutDeletingAnything() {
        when(requestRepository.findAllById(List.of(10L))).thenReturn(List.of(request(10, 5)));
        AccessScopeContext.set(new AccessScopeContext.ScopeData(1L, 55L,
                UserRole.AccessScope.BRANCH, List.of(55L)));

        assertThatThrownBy(() -> service.deleteRequests(List.of(10L)))
                .isInstanceOf(AccessDeniedException.class);
        verify(requestRepository, never()).deleteAll(anyList());
    }

    @Test void deletesSelectedAllocationsWithinCompanyScope() {
        LeaveAllocation first = allocation(20, 55), second = allocation(21, 55);
        when(allocationRepository.findAllById(List.of(20L, 21L))).thenReturn(List.of(first, second));
        AccessScopeContext.set(new AccessScopeContext.ScopeData(1L, 55L,
                UserRole.AccessScope.BRANCH, List.of(55L)));
        assertThat(service.deleteAllocations(List.of(20L, 21L))).isEqualTo(2);
        verify(allocationRepository).deleteAll(List.of(first, second));
    }

    @Test void rejectsAllocationOutsideSelectedCompany() {
        when(allocationRepository.findAllById(List.of(20L))).thenReturn(List.of(allocation(20, 5)));
        AccessScopeContext.set(new AccessScopeContext.ScopeData(1L, 55L,
                UserRole.AccessScope.BRANCH, List.of(55L)));
        assertThatThrownBy(() -> service.deleteAllocations(List.of(20L)))
                .isInstanceOf(AccessDeniedException.class);
        verify(allocationRepository, never()).deleteAll(anyList());
    }
}
