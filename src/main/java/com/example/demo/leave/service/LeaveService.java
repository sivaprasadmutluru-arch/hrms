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
    private final HolidayAllocationRepository holidayAllocationRepository;
    private final CompanyLeaveRepository companyLeaveRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final LeaveRequestConditionApprovalRepository conditionApprovalRepository;

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

        // Validate balance: available + carryforward + forecasted (mirrors Horilla)
        AvailableLeave balance = getOrCreateAvailableLeave(employeeId, leaveTypeId);
        double availDays = balance.getAvailableDays() != null ? balance.getAvailableDays() : 0.0;
        double cfDays = resolveCarryforwardDays(balance);
        double forecasted = balance.forcastedLeaves(startDate);
        double totalBalance = availDays + cfDays + forecasted;
        if (days > totalBalance) {
            // Check negative balance allowance
            boolean negAllowed = Boolean.TRUE.equals(leaveType.getNegativeBalanceAllowed());
            if (negAllowed) {
                double limit = leaveType.getNegativeBalanceLimit() != null ? leaveType.getNegativeBalanceLimit() : Double.MAX_VALUE;
                double wouldBeBalance = totalBalance - days;
                if (wouldBeBalance < -limit) {
                    throw new BadRequestException(
                            "Exceeds negative balance limit. Limit: -" + limit + ", Would be: " + wouldBeBalance);
                }
            } else {
                throw new BadRequestException(
                        "Insufficient leave balance. Available: " + totalBalance + ", Requested: " + days);
            }
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
            deductBalance(balance, days, request);
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

        // Enforce that all condition approvals are completed before approving
        List<LeaveRequestConditionApproval> conditionApprovals =
                conditionApprovalRepository.findByLeaveRequestIdOrderBySequenceAsc(requestId);
        boolean hasPending = conditionApprovals.stream()
                .anyMatch(a -> !Boolean.TRUE.equals(a.getIsApproved()) && !Boolean.TRUE.equals(a.getIsRejected()));
        if (hasPending) {
            throw new BadRequestException("All condition approval steps must be completed before approving this request");
        }

        AvailableLeave balance = getOrCreateAvailableLeave(
                request.getEmployee().getId(), request.getLeaveType().getId());

        double availDays = balance.getAvailableDays() != null ? balance.getAvailableDays() : 0.0;
        double cfDays = resolveCarryforwardDays(balance);
        // FIX #4: include forecasted balance so leaves approved based on an upcoming reset
        // are not rejected at the approval step (mirrors applyLeave logic)
        double forecasted = balance.forcastedLeaves(request.getStartDate());
        double totalBalance = availDays + cfDays + forecasted;
        if (request.getRequestedDays() > totalBalance) {
            throw new BadRequestException(
                    "Insufficient leave balance. Available: " + totalBalance
                            + ", Requested: " + request.getRequestedDays());
        }

        deductBalance(balance, request.getRequestedDays(), request);
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
                    request.getLeaveType().getId(), request);
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
                    request.getLeaveType().getId(), request);
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
    public LeaveType updateLeaveType(Long id, LeaveType updated) {
        LeaveType lt = leaveTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveType", id));
        lt.setName(updated.getName());
        lt.setTotalDays(updated.getTotalDays());
        lt.setPaymentType(updated.getPaymentType());
        lt.setCarryforwardType(updated.getCarryforwardType());
        lt.setCarryforwardMax(updated.getCarryforwardMax());
        lt.setLeaveValidationType(updated.getLeaveValidationType());
        lt.setColorCode(updated.getColorCode());
        lt.setReset(updated.getReset());
        lt.setResetBased(updated.getResetBased());
        lt.setResetMonth(updated.getResetMonth());
        lt.setResetDay(updated.getResetDay());
        lt.setResetWeekend(updated.getResetWeekend());
        lt.setCarryforwardExpireIn(updated.getCarryforwardExpireIn());
        lt.setCarryforwardExpirePeriod(updated.getCarryforwardExpirePeriod());
        lt.setCarryforwardExpireDate(updated.getCarryforwardExpireDate());
        lt.setExcludeHoliday(updated.getExcludeHoliday());
        lt.setExcludeCompanyLeave(updated.getExcludeCompanyLeave());
        lt.setRequireAttachment(updated.getRequireAttachment());
        lt.setLimitLeave(updated.getLimitLeave());
        lt.setIsEncashable(updated.getIsEncashable());
        lt.setAccrualEnabled(updated.getAccrualEnabled());
        lt.setMidYearJoinerMode(updated.getMidYearJoinerMode());
        lt.setNegativeBalanceAllowed(updated.getNegativeBalanceAllowed());
        lt.setNegativeBalanceLimit(updated.getNegativeBalanceLimit());
        return leaveTypeRepository.save(lt);
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

        // Sync AvailableLeave — preserve existing carryforward, only reset for new records
        boolean isNewBalance = availableLeaveRepository
                .findByEmployeeIdAndLeaveTypeId(employeeId, leaveTypeId).isEmpty();
        AvailableLeave balance = getOrCreateAvailableLeave(employeeId, leaveTypeId);
        balance.setAvailableDays(days);
        if (isNewBalance) {
            balance.setCarryforwardDays(0.0);
        }
        balance.setAssignedDate(LocalDate.now());
        // Set reset_date if this leave type has reset configured (mirrors Horilla pre_save_processing)
        if (Boolean.TRUE.equals(balance.getLeaveType().getReset()) && balance.getResetDate() == null) {
            balance.setResetDate(balance.computeNextResetDate(LocalDate.now()));
        }
        // Set expired_date for CARRYFORWARD_EXPIRE types using the LeaveType's carryforward_expire_date
        if (balance.getLeaveType().getCarryforwardType() == LeaveType.CarryforwardType.CARRYFORWARD_EXPIRE) {
            balance.setExpiredDate(balance.getLeaveType().getCarryforwardExpireDate());
        }
        availableLeaveRepository.save(balance);
    }

    /**
     * Bulk allocate a leave type to ALL active employees in a company.
     */
    @Transactional
    public int bulkAllocate(Long companyId, Long leaveTypeId, double days, int year) {
        List<Employee> employees = employeeRepository.findByCompanyIdAndIsActiveTrue(companyId);
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

        // Idempotency guard: skip if next year's allocations already exist as ACTIVE
        List<LeaveAllocation> existingNext = leaveAllocationRepository.findByCompanyIdAndYear(companyId, nextYear);
        boolean alreadyReset = existingNext.stream()
                .anyMatch(a -> a.getStatus() == LeaveAllocation.AllocationStatus.ACTIVE);
        if (alreadyReset) {
            log.info("Annual reset already run for year {} in company {}, skipping", nextYear, companyId);
            return;
        }

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
                balance.setExpiredDate(computeCarryforwardExpireDate(leaveType, nextYear));
            }
            availableLeaveRepository.save(balance);

            log.info("Annual reset: employee={} leaveType={} carryForward={} nextYearTotal={}",
                    current.getEmployee().getId(), leaveType.getName(), carryForward, totalNextYear);
        }
    }

    // ─── Working Days Calculation ─────────────────────────────────────────────

    /**
     * Calculates the number of working days between start and end (inclusive),
     * excluding weekends, company-defined holidays, allocated holidays, and company leaves.
     */
    public double calculateWorkingDays(LocalDate start, LocalDate end, Long companyId, LeaveType leaveType) {
        return calculateWorkingDays(start, end, companyId, leaveType, null);
    }

    public double calculateWorkingDays(LocalDate start, LocalDate end, Long companyId, LeaveType leaveType, Long employeeId) {
        // Build exclusion set
        Set<LocalDate> excludedDates = new HashSet<>();

        if (Boolean.TRUE.equals(leaveType.getExcludeHoliday()) && companyId != null) {
            // Company-wide holidays
            List<Holiday> holidays = holidayRepository.findByCompanyIdAndDateRange(companyId, start, end);
            for (Holiday h : holidays) {
                // FIX #3: guard against null endDate (single-day holidays created without one)
                LocalDate hEnd = h.getEndDate() != null ? h.getEndDate() : h.getStartDate();
                LocalDate d = h.getStartDate();
                while (!d.isAfter(hEnd)) {
                    excludedDates.add(d);
                    d = d.plusDays(1);
                }
            }
            // Employee/department-specific allocated holidays
            if (employeeId != null) {
                Employee emp = employeeRepository.findById(employeeId).orElse(null);
                Long deptId = (emp != null && emp.getDepartment() != null) ? emp.getDepartment().getId() : null;
                List<HolidayAllocation> allocated = (deptId != null)
                        ? holidayAllocationRepository.findApplicableForEmployee(companyId, employeeId, deptId)
                        : holidayAllocationRepository.findByEmployeeId(employeeId);
                for (HolidayAllocation ha : allocated) {
                    Holiday h = ha.getHoliday();
                    if (h.getStartDate() != null && h.getEndDate() != null) {
                        LocalDate d = h.getStartDate().isBefore(start) ? start : h.getStartDate();
                        LocalDate hEnd = h.getEndDate().isAfter(end) ? end : h.getEndDate();
                        while (!d.isAfter(hEnd)) {
                            excludedDates.add(d);
                            d = d.plusDays(1);
                        }
                    }
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

    /**
     * Returns the effective carryforward days capped by carryforward_max (mirrors Horilla validation logic).
     */
    private double resolveCarryforwardDays(AvailableLeave balance) {
        if (balance.getLeaveType() == null) return 0.0;
        LeaveType.CarryforwardType cfType = balance.getLeaveType().getCarryforwardType();
        if (cfType == null || cfType == LeaveType.CarryforwardType.NO_CARRYFORWARD) return 0.0;
        double cf = balance.getCarryforwardDays() != null ? balance.getCarryforwardDays() : 0.0;
        Double max = balance.getLeaveType().getCarryforwardMax();
        return max != null ? Math.min(cf, max) : cf;
    }

    /**
     * Deducts days from available_days first, then from carryforward_days.
     * Tracks how much was taken from each on the request (mirrors Horilla no_approval()).
     */
    private void deductBalance(AvailableLeave balance, double days, LeaveRequest request) {
        double avail = balance.getAvailableDays() != null ? balance.getAvailableDays() : 0.0;
        if (days > avail) {
            double fromCarry = days - avail;
            request.setApprovedAvailableDays(avail);
            request.setApprovedCarryforwardDays(fromCarry);
            balance.setAvailableDays(0.0);
            balance.setCarryforwardDays(Math.max(0.0,
                    (balance.getCarryforwardDays() != null ? balance.getCarryforwardDays() : 0.0) - fromCarry));
        } else {
            request.setApprovedAvailableDays(days);
            request.setApprovedCarryforwardDays(0.0);
            balance.setAvailableDays(avail - days);
        }
        availableLeaveRepository.save(balance);
    }

    /**
     * Computes the carryforward expiry date from LeaveType config.
     * Uses carryforwardExpireDate if set, otherwise derives from carryforwardExpireIn + carryforwardExpirePeriod
     * relative to Jan 1 of the given year. Falls back to June 30 if no config found.
     */
    private LocalDate computeCarryforwardExpireDate(LeaveType leaveType, int year) {
        if (leaveType.getCarryforwardExpireDate() != null) {
            return leaveType.getCarryforwardExpireDate();
        }
        if (leaveType.getCarryforwardExpireIn() != null && leaveType.getCarryforwardExpirePeriod() != null) {
            LocalDate base = LocalDate.of(year, 1, 1);
            int amount = leaveType.getCarryforwardExpireIn();
            return switch (leaveType.getCarryforwardExpirePeriod()) {
                case "day"   -> base.plusDays(amount);
                case "month" -> base.plusMonths(amount);
                case "year"  -> base.plusYears(amount);
                default      -> LocalDate.of(year, 6, 30);
            };
        }
        return LocalDate.of(year, 6, 30);
    }

    /**
     * Restores balance using the exact amounts tracked on the request.
     */
    private void restoreBalance(Long employeeId, Long leaveTypeId, LeaveRequest request) {
        AvailableLeave balance = getOrCreateAvailableLeave(employeeId, leaveTypeId);
        double fromAvail = request.getApprovedAvailableDays() != null ? request.getApprovedAvailableDays() : 0.0;
        double fromCarry = request.getApprovedCarryforwardDays() != null ? request.getApprovedCarryforwardDays() : 0.0;
        balance.setAvailableDays((balance.getAvailableDays() != null ? balance.getAvailableDays() : 0.0) + fromAvail);
        balance.setCarryforwardDays((balance.getCarryforwardDays() != null ? balance.getCarryforwardDays() : 0.0) + fromCarry);
        availableLeaveRepository.save(balance);
    }
}
