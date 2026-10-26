package com.example.demo.attendance.controller;

import com.example.demo.auth.entity.UserRole;
import com.example.demo.base.entity.*;
import com.example.demo.base.repository.*;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.employee.entity.*;
import com.example.demo.employee.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ShiftAllocationControllerTest {
    final ShiftAllocationRequestRepository allocations = mock(ShiftAllocationRequestRepository.class);
    final EmployeeRepository employees = mock(EmployeeRepository.class);
    final ShiftScheduleRepository shifts = mock(ShiftScheduleRepository.class);
    final CompanyRepository companies = mock(CompanyRepository.class);
    final EmployeeWorkInformationRepository work = mock(EmployeeWorkInformationRepository.class);
    final ShiftAllocationController controller = new ShiftAllocationController(allocations, employees, shifts, companies, work);
    final Company company = new Company();
    final Employee employee = new Employee();
    final ShiftSchedule shift = new ShiftSchedule();
    final EmployeeWorkInformation profile = new EmployeeWorkInformation();
    final ShiftAllocationRequest request = new ShiftAllocationRequest();

    @BeforeEach void setup() {
        company.setId(10L); employee.setId(1L); employee.setCompany(company);
        shift.setId(20L); shift.setCompany(company); shift.setName("New Shift");
        request.setId(3L); request.setCompany(company); request.setEmployee(employee); request.setAllocatedShift(shift);
        when(allocations.findById(3L)).thenReturn(Optional.of(request));
        when(allocations.save(any())).thenAnswer(call -> call.getArgument(0));
        when(work.findByEmployeeId(1L)).thenReturn(Optional.of(profile));
        AccessScopeContext.set(new AccessScopeContext.ScopeData(9L,10L,UserRole.AccessScope.ENTERPRISE,List.of(10L)));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("test", null));
    }
    @AfterEach void clear() {AccessScopeContext.clear(); SecurityContextHolder.clearContext();}

    @Test void approvalReplacesStaleEmployeeAndWorkInformationShifts() {
        employee.setShift(new ShiftSchedule()); profile.setShift(new ShiftSchedule());
        controller.approve(3L);
        assertSame(shift, employee.getShift()); assertSame(shift, profile.getShift());
        verify(employees).save(employee); verify(work).save(profile);
        assertEquals(ShiftAllocationRequest.AllocationStatus.APPROVED, request.getStatus());
    }
    @Test void approvalWithoutWorkInformationStillAssignsEmployeeShift() {
        when(work.findByEmployeeId(1L)).thenReturn(Optional.empty());
        controller.approve(3L);
        assertSame(shift, employee.getShift()); verify(employees).save(employee);
    }
    @Test void bulkAllocationAlsoAssignsEmployeeWithoutWorkInformation() {
        when(work.findByEmployeeId(1L)).thenReturn(Optional.empty());
        when(employees.findById(1L)).thenReturn(Optional.of(employee));
        when(shifts.getReferenceById(20L)).thenReturn(shift);
        when(companies.getReferenceById(10L)).thenReturn(company);
        controller.bulkAllocate(Map.of("employeeIds", List.of(1), "shiftId",20, "companyId",10));
        assertSame(shift, employee.getShift()); verify(employees).save(employee);
    }
    @Test void editingApprovedAllocationKeepsBothShiftFieldsInSync() {
        request.setStatus(ShiftAllocationRequest.AllocationStatus.APPROVED);
        ShiftSchedule replacement = new ShiftSchedule(); replacement.setId(21L); replacement.setCompany(company);
        when(shifts.getReferenceById(21L)).thenReturn(replacement);
        ShiftAllocationRequest edit = new ShiftAllocationRequest(); edit.setAllocatedShift(replacement);
        controller.update(3L, edit);
        assertSame(replacement, employee.getShift()); assertSame(replacement, profile.getShift());
    }
    @Test void editingPendingAllocationDoesNotChangeActiveShift() {
        when(shifts.getReferenceById(20L)).thenReturn(shift);
        ShiftAllocationRequest edit = new ShiftAllocationRequest(); edit.setAllocatedShift(shift);
        controller.update(3L, edit);
        verify(employees, never()).save(any()); verify(work, never()).save(any());
    }
    @Test void mismatchedCompanyShiftCannotBeAssigned() {
        Company other = new Company(); other.setId(99L); shift.setCompany(other);
        assertThrows(BadRequestException.class, () -> controller.approve(3L));
        verify(employees, never()).save(any());
    }
    @Test void outsideCompanyAndCancelledAllocationsCannotBeApproved() {
        AccessScopeContext.set(new AccessScopeContext.ScopeData(9L,99L,UserRole.AccessScope.BRANCH,List.of(99L)));
        assertThrows(AccessDeniedException.class, () -> controller.approve(3L));
        AccessScopeContext.set(new AccessScopeContext.ScopeData(9L,10L,UserRole.AccessScope.BRANCH,List.of(10L)));
        request.setStatus(ShiftAllocationRequest.AllocationStatus.CANCELLED);
        assertThrows(BadRequestException.class, () -> controller.approve(3L));
        verify(employees, never()).save(any());
    }
}
