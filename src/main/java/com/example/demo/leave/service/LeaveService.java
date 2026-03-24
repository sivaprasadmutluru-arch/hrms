package com.example.demo.leave.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.event.LeaveApprovedEvent;
import com.example.demo.common.event.LeaveRejectedEvent;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.entity.*;
import com.example.demo.leave.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class LeaveService {

    private final ApplicationEventPublisher eventPublisher;
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveAllocationRepository leaveAllocationRepository;
    private final AvailableLeaveRepository availableLeaveRepository;
    private final HolidayRepository holidayRepository;
    private final CompanyLeaveRepository companyLeaveRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;

    // ─── Queries ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<LeaveRequest> getAllRequests(Pageable pageable) {
        Specification<LeaveRequest> spec = ScopeFilter.byEmployeeDepartment();
        return spec != null
                ? leaveRequestRepository.findAll(spec, pageable)
                : leaveRequestRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public List<LeaveType> getLeaveTypes() {
        Specification<LeaveType> spec = ScopeFilter.byCompany();
        if (spec != null) {
            Specification<LeaveType> orgWide = (root, query, cb) -> cb.isTrue(root.get("isOrganizationWide"));
            return leaveTypeRepository.findAll(Specification.where(spec).or(orgWide));
        }
        return leaveTypeRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<LeaveAllocation> getAllocations(Long employeeId, Integer year) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope != null && scope.isSelfScope()) {
            return employeeRepository.findByUserId(scope.getUserId())
                    .map(e -> leaveAllocationRepository.findByEmployeeId(e.getId()))
                    .orElse(java.util.Collections.emptyList());
        }
        if (employeeId != null) return leaveAllocationRepository.findByEmployeeId(employeeId);
        Long companyId = scope != null ? scope.getCompanyId() : null;
        if (companyId != null && year != null) return leaveAllocationRepository.findByCompanyIdAndYear(companyId, year);
        if (companyId != null) return leaveAllocationRepository.findByCompanyId(companyId);
        return leaveAllocationRepository.findAll();
    }

    @Transactional(readOnly = true)
    public LeaveRequest getRequestById(Long id) {
        return leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", id));
    }

    // ─── Apply Leave ──────────────────────────────────────────────────────────

    @Transactional
    public LeaveRequest applyLeave(Long employeeId, Long leaveTypeId, LocalDate startDate,
                                    LocalDate endDate, String description, Long companyId) {
        LeaveType leaveType = leaveTypeRepository.findById(leaveTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveType", leaveTypeId));

        double days = calculateWorkingDays(startDate, endDate, companyId, leaveType);

        // Validate balance against AvailableLeave (primary balance store)
        AvailableLeave balance = getOrCreateAvailableLeave(employeeId, leaveTypeId);
        if (balance.getAvailableDays() < days) {
            throw new BadRequestException(
                    "Insufficient leave balance. Available: " + balance.getAvailableDays() + ", Requested: " + days);
        }

        LeaveRequest request = new LeaveRequest();
        request.setEmployee(employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId)));
        request.setLeaveType(leaveType);
        request.setStartDate(startDate);
        request.setEndDate(endDate);
        request.setRequestedDays(days);
        request.setDescription(description);
        request.setStatus(LeaveRequest.LeaveStatus.REQUESTED);
        request.setCompany(companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId)));

        if (leaveType.getLeaveValidationType() == LeaveType.LeaveValidationType.AUTOMATIC) {
            deductBalance(balance, days);
            request.setStatus(LeaveRequest.LeaveStatus.APPROVED);
        }

        return leaveRequestRepository.save(request);
    }

    // ─── Approve / Reject / Cancel ────────────────────────────────────────────

    @Transactional
    public LeaveRequest approve(Long requestId) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", requestId));
        if (request.getStatus() != LeaveRequest.LeaveStatus.REQUESTED) {
            throw new BadRequestException("Leave request is not in REQUESTED state");
        }

        AvailableLeave balance = getOrCreateAvailableLeave(
                request.getEmployee().getId(), request.getLeaveType().getId());

        if (balance.getAvailableDays() < request.getRequestedDays()) {
            throw new BadRequestException(
                    "Insufficient leave balance. Available: " + balance.getAvailableDays()
                            + ", Requested: " + request.getRequestedDays());
        }

        deductBalance(balance, request.getRequestedDays());
        request.setStatus(LeaveRequest.LeaveStatus.APPROVED);
        LeaveRequest saved = leaveRequestRepository.save(request);
        eventPublisher.publishEvent(new LeaveApprovedEvent(this, saved));
        return saved;
    }

    @Transactional
    public LeaveRequest reject(Long requestId, String reason) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", requestId));

        // If the request was already APPROVED, restore the balance
        if (request.getStatus() == LeaveRequest.LeaveStatus.APPROVED) {
            restoreBalance(request.getEmployee().getId(),
                    request.getLeaveType().getId(),
                    request.getRequestedDays());
        }

        request.setStatus(LeaveRequest.LeaveStatus.REJECTED);
        request.setRejectReason(reason);
        LeaveRequest saved = leaveRequestRepository.save(request);
        eventPublisher.publishEvent(new LeaveRejectedEvent(this, saved, reason));
        return saved;
    }

    @Transactional
    public LeaveRequest cancel(Long requestId) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", requestId));

        if (request.getStatus() == LeaveRequest.LeaveStatus.CANCELLED) {
            throw new BadRequestException("Leave request is already cancelled");
        }

        // Restore balance only if leave was approved (deduction already happened)
        if (request.getStatus() == LeaveRequest.LeaveStatus.APPROVED) {
            restoreBalance(request.getEmployee().getId(),
                    request.getLeaveType().getId(),
                    request.getRequestedDays());
        }

        request.setStatus(LeaveRequest.LeaveStatus.CANCELLED);
        return leaveRequestRepository.save(request);
    }

    // ─── Leave Types ──────────────────────────────────────────────────────────

    @Transactional
    public LeaveType createLeaveType(LeaveType leaveType) {
        if (Boolean.TRUE.equals(leaveType.getIsOrganizationWide())) {
            AccessScopeContext.ScopeData scope = AccessScopeContext.get();
            if (scope != null && !scope.hasUnrestrictedAccess()
                    && scope.getScope() == com.example.demo.auth.entity.UserRole.AccessScope.BRANCH) {
                throw new BadRequestException(
                        "Only Head Office admins can create organization-wide leave policies.");
            }
        }
        return leaveTypeRepository.save(leaveType);
    }

    @Transactional
    public void deleteLeaveType(Long id) {
        LeaveType lt = leaveTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveType", id));
        leaveTypeRepository.delete(lt);
    }

    // ─── Allocation ───────────────────────────────────────────────────────────

    @Transactional
    public void allocateLeave(Long employeeId, Long leaveTypeId, double days, int year, Long companyId) {
        LeaveAllocation allocation = leaveAllocationRepository
                .findByEmployeeIdAndLeaveTypeIdAndYear(employeeId, leaveTypeId, year)
                .orElseGet(() -> {
                    LeaveAllocation a = new LeaveAllocation();
                    a.setEmployee(employeeRepository.findById(employeeId)
                            .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId)));
                    a.setLeaveType(leaveTypeRepository.findById(leaveTypeId)
                            .orElseThrow(() -> new ResourceNotFoundException("LeaveType", leaveTypeId)));
                    a.setYear(year);
                    a.setCompany(companyRepository.findById(companyId)
                            .orElseThrow(() -> new ResourceNotFoundException("Company", companyId)));
                    return a;
                });
        allocation.setTotalLeaveDays(days);
        allocation.setAvailableDays(days);
        leaveAllocationRepository.save(allocation);

        // Sync AvailableLeave
        AvailableLeave balance = getOrCreateAvailableLeave(employeeId, leaveTypeId);
        balance.setAvailableDays(days);
        balance.setTotalLeaveDays(days);
        balance.setAssignedDate(LocalDate.now());
        availableLeaveRepository.save(balance);
    }

    /**
     * Bulk allocate a leave type to ALL active employees in a company.
     */
    @Transactional
    public int bulkAllocate(Long companyId, Long leaveTypeId, double days, int year) {
        List<Employee> employees = employeeRepository.findByCompanyId(companyId);
        for (Employee emp : employees) {
            allocateLeave(emp.getId(), leaveTypeId, days, year, companyId);
        }
        return employees.size();
    }

    // ─── Annual Carry-Forward & Reset ─────────────────────────────────────────

    /**
     * Performs annual leave reset for a company:
     * - Expires the current year's allocations
     * - Creates next year's allocations applying carry-forward rules from LeaveType
     * - Updates AvailableLeave balances accordingly
     */
    @Transactional
    public void annualReset(Long companyId, int currentYear) {
        int nextYear = currentYear + 1;
        List<LeaveAllocation> currentAllocations = leaveAllocationRepository.findByCompanyIdAndYear(companyId, currentYear);

        for (LeaveAllocation current : currentAllocations) {
            LeaveType leaveType = current.getLeaveType();
            double remainingDays = current.getAvailableDays() != null ? current.getAvailableDays() : 0.0;
            double carryForward = 0.0;

            switch (leaveType.getCarryforwardType()) {
                case CARRYFORWARD:
                    // Carry forward remaining days, capped by carryforwardMax
                    carryForward = remainingDays;
                    if (leaveType.getCarryforwardMax() != null && carryForward > leaveType.getCarryforwardMax()) {
                        carryForward = leaveType.getCarryforwardMax();
                    }
                    break;
                case CARRYFORWARD_EXPIRE:
                    // Same cap, but mark expiry date (carried days expire mid-year)
                    carryForward = remainingDays;
                    if (leaveType.getCarryforwardMax() != null && carryForward > leaveType.getCarryforwardMax()) {
                        carryForward = leaveType.getCarryforwardMax();
                    }
                    break;
                case NO_CARRYFORWARD:
                default:
                    carryForward = 0.0;
                    break;
            }

            // Expire current allocation
            current.setStatus(LeaveAllocation.AllocationStatus.EXPIRED);
            leaveAllocationRepository.save(current);

            // Create next year's allocation
            double baseDays = leaveType.getTotalDays() != null ? leaveType.getTotalDays().doubleValue() : 0.0;
            double totalNextYear = baseDays + carryForward;

            LeaveAllocation next = leaveAllocationRepository
                    .findByEmployeeIdAndLeaveTypeIdAndYear(
                            current.getEmployee().getId(), leaveType.getId(), nextYear)
                    .orElseGet(() -> {
                        LeaveAllocation n = new LeaveAllocation();
                        n.setEmployee(current.getEmployee());
                        n.setLeaveType(leaveType);
                        n.setYear(nextYear);
                        n.setCompany(current.getCompany());
                        return n;
                    });
            next.setTotalLeaveDays(totalNextYear);
            next.setAvailableDays(totalNextYear);
            next.setCarryforwardDays(carryForward);
            next.setStatus(LeaveAllocation.AllocationStatus.ACTIVE);
            leaveAllocationRepository.save(next);

            // Sync AvailableLeave
            AvailableLeave balance = getOrCreateAvailableLeave(
                    current.getEmployee().getId(), leaveType.getId());
            balance.setAvailableDays(totalNextYear);
            balance.setTotalLeaveDays(totalNextYear);
            balance.setCarryforwardDays(carryForward);
            balance.setAssignedDate(LocalDate.of(nextYear, 1, 1));
            balance.setResetDate(LocalDate.of(nextYear, 1, 1));
            if (leaveType.getCarryforwardType() == LeaveType.CarryforwardType.CARRYFORWARD_EXPIRE) {
                // Carried days expire mid-year (June 30)
                balance.setExpiredDate(LocalDate.of(nextYear, 6, 30));
            }
            availableLeaveRepository.save(balance);

            log.info("Annual reset: employee={} leaveType={} carryForward={} nextYearTotal={}",
                    current.getEmployee().getId(), leaveType.getName(), carryForward, totalNextYear);
        }
    }

    // ─── Working Days Calculation ─────────────────────────────────────────────

    /**
     * Calculates the number of working days between start and end (inclusive),
     * excluding weekends, company-defined holidays, and company leaves based on LeaveType config.
     */
    public double calculateWorkingDays(LocalDate start, LocalDate end, Long companyId, LeaveType leaveType) {
        // Build exclusion set
        Set<LocalDate> excludedDates = new HashSet<>();

        if (Boolean.TRUE.equals(leaveType.getExcludeHoliday()) && companyId != null) {
            List<Holiday> holidays = holidayRepository.findByCompanyIdAndDateRange(companyId, start, end);
            for (Holiday h : holidays) {
                LocalDate d = h.getStartDate();
                while (!d.isAfter(h.getEndDate())) {
                    excludedDates.add(d);
                    d = d.plusDays(1);
                }
            }
        }

        if (Boolean.TRUE.equals(leaveType.getExcludeCompanyLeave()) && companyId != null) {
            List<CompanyLeave> companyLeaves = companyLeaveRepository.findByCompanyId(companyId);
            for (CompanyLeave cl : companyLeaves) {
                if (Boolean.TRUE.equals(cl.getBasedOnWeekDay()) && cl.getWeekDay() != null) {
                    // Mark all occurrences of this weekday in the range
                    LocalDate d = start;
                    while (!d.isAfter(end)) {
                        // Java DayOfWeek: Monday=1 … Sunday=7; Horilla weekday: 0=Monday … 6=Sunday
                        int javaDow = d.getDayOfWeek().getValue(); // 1-7
                        int horillaStyle = javaDow - 1; // 0-6
                        if (horillaStyle == cl.getWeekDay()) {
                            excludedDates.add(d);
                        }
                        d = d.plusDays(1);
                    }
                } else if (cl.getStartDate() != null && cl.getEndDate() != null) {
                    LocalDate d = cl.getStartDate().isBefore(start) ? start : cl.getStartDate();
                    LocalDate clEnd = cl.getEndDate().isAfter(end) ? end : cl.getEndDate();
                    while (!d.isAfter(clEnd)) {
                        excludedDates.add(d);
                        d = d.plusDays(1);
                    }
                }
            }
        }

        long days = 0;
        LocalDate current = start;
        while (!current.isAfter(end)) {
            if (current.getDayOfWeek() != DayOfWeek.SATURDAY
                    && current.getDayOfWeek() != DayOfWeek.SUNDAY
                    && !excludedDates.contains(current)) {
                days++;
            }
            current = current.plusDays(1);
        }
        return days;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    private AvailableLeave getOrCreateAvailableLeave(Long employeeId, Long leaveTypeId) {
        return availableLeaveRepository.findByEmployeeIdAndLeaveTypeId(employeeId, leaveTypeId)
                .orElseGet(() -> {
                    AvailableLeave av = new AvailableLeave();
                    av.setEmployee(employeeRepository.getReferenceById(employeeId));
                    av.setLeaveType(leaveTypeRepository.getReferenceById(leaveTypeId));
                    av.setAvailableDays(0.0);
                    av.setTotalLeaveDays(0.0);
                    av.setCarryforwardDays(0.0);
                    return av;
                });
    }

    private void deductBalance(AvailableLeave balance, double days) {
        balance.setAvailableDays(Math.max(0.0, balance.getAvailableDays() - days));
        availableLeaveRepository.save(balance);
    }

    private void restoreBalance(Long employeeId, Long leaveTypeId, double days) {
        AvailableLeave balance = getOrCreateAvailableLeave(employeeId, leaveTypeId);
        balance.setAvailableDays(balance.getAvailableDays() + days);
        availableLeaveRepository.save(balance);
    }
}
