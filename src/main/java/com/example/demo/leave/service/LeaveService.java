package com.example.demo.leave.service;

import com.example.demo.base.entity.EmployeeType;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.EmployeeTypeRepository;
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
    private final EmployeeTypeRepository employeeTypeRepository;
    private final LeaveRequestConditionApprovalRepository conditionApprovalRepository;

    // ─── Queries ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<LeaveRequest> getAllRequests(Pageable pageable) {
        // NOTE: byEmployeeDepartment() honors the X-Filter-Company-Id header (topbar branch
        // switcher) centrally via ScopeFilter.applyBranchFilter.
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

        // Reject if employee already has an active (pending or approved) request overlapping these dates
        List<LeaveRequest> overlapping = leaveRequestRepository.findActiveOverlapping(employeeId, startDate, endDate);
        if (!overlapping.isEmpty()) {
            LeaveRequest clash = overlapping.get(0);
            throw new BadRequestException(
                    "You already have a " + clash.getStatus().name().toLowerCase() +
                    " leave request from " + clash.getStartDate() + " to " + clash.getEndDate() +
                    " that overlaps with the requested dates.");
        }

        // Validate balance: remaining is DERIVED (available + carryforward − used), not stored.
        // Available Days is the constant allocation; we never read it as "what's left" anymore.
        AvailableLeave balance = getOrCreateAvailableLeave(employeeId, leaveTypeId);
        double remaining = computeRemaining(balance, employeeId, leaveTypeId);
        double forecasted = balance.forcastedLeaves(startDate);
        double totalBalance = remaining + forecasted;
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
    public LeaveRequest approve(Long requestId, Long approverUserId) {
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

        // Balance check: remaining is DERIVED (available + carryforward − used), not stored.
        double remaining = computeRemaining(balance, request.getEmployee().getId(), request.getLeaveType().getId());
        double forecasted = balance.forcastedLeaves(request.getStartDate());
        double totalBalance = remaining + forecasted;
        if (request.getRequestedDays() > totalBalance) {
            throw new BadRequestException(
                    "Insufficient leave balance. Available: " + totalBalance
                            + ", Requested: " + request.getRequestedDays());
        }

        deductBalance(balance, request.getRequestedDays(), request);
        request.setStatus(LeaveRequest.LeaveStatus.APPROVED);
        if (approverUserId != null) {
            employeeRepository.findByUserId(approverUserId)
                    .ifPresent(request::setApprovedBy);
        }
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
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (Boolean.TRUE.equals(leaveType.getIsOrganizationWide())) {
            if (scope != null && !scope.hasUnrestrictedAccess()
                    && scope.getScope() == com.example.demo.auth.entity.UserRole.AccessScope.BRANCH) {
                throw new BadRequestException(
                        "Only Head Office admins can create organization-wide leave policies.");
            }
        }
        if (leaveType.getCompany() == null) {
            Long companyId = scope != null ? scope.getCompanyId() : null;
            if (companyId == null) throw new BadRequestException("Unable to determine company from session.");
            leaveType.setCompany(companyRepository.findById(companyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Company", companyId)));
        }
        resolveApplicableEmployeeTypes(leaveType);
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
        lt.setExcludeWeekend(updated.getExcludeWeekend());
        lt.setRequireAttachment(updated.getRequireAttachment());
        lt.setLimitLeave(updated.getLimitLeave());
        lt.setIsEncashable(updated.getIsEncashable());
        lt.setAccrualEnabled(updated.getAccrualEnabled());
        lt.setMidYearJoinerMode(updated.getMidYearJoinerMode());
        lt.setNegativeBalanceAllowed(updated.getNegativeBalanceAllowed());
        lt.setNegativeBalanceLimit(updated.getNegativeBalanceLimit());
        lt.setActive(updated.isActive());
        if (updated.getApplicableEmployeeTypes() != null) {
            List<Long> ids = updated.getApplicableEmployeeTypes().stream()
                    .filter(et -> et.getId() != null).map(EmployeeType::getId).toList();
            lt.setApplicableEmployeeTypes(ids.isEmpty() ? new java.util.ArrayList<>()
                    : employeeTypeRepository.findAllById(ids));
        }
        return leaveTypeRepository.save(lt);
    }

    private void resolveApplicableEmployeeTypes(LeaveType leaveType) {
        if (leaveType.getApplicableEmployeeTypes() != null && !leaveType.getApplicableEmployeeTypes().isEmpty()) {
            List<Long> ids = leaveType.getApplicableEmployeeTypes().stream()
                    .filter(et -> et.getId() != null).map(EmployeeType::getId).toList();
            leaveType.setApplicableEmployeeTypes(ids.isEmpty() ? new java.util.ArrayList<>()
                    : employeeTypeRepository.findAllById(ids));
        }
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

    // ─── Reconciliation ──────────────────────────────────────────────────────

    /**
     * One-time reconciliation: restores available_days and carryforward_days on
     * AvailableLeave rows from the matching ACTIVE LeaveAllocation record.
     *
     * Under the old deductBalance() logic, approving leave requests overwrote
     * availableDays with the remaining balance instead of keeping the allocation
     * constant. This method resets every corrupted row back to its true allocated
     * amount so that "Available Days" once again equals the assigned/allocation.
     *
     * Only rows where the current availableDays differs from the allocation are
     * updated (safe to re-run).
     *
     * @return the number of rows that were fixed
     */
    @Transactional
    public int reconcileAvailableDaysFromAllocations(Long companyId) {
        List<AvailableLeave> balances = availableLeaveRepository.findAll().stream()
                .filter(al -> al.getEmployee() != null && al.getEmployee().getCompany() != null
                        && al.getEmployee().getCompany().getId().equals(companyId))
                .toList();

        int fixed = 0;
        for (AvailableLeave al : balances) {
            Long empId = al.getEmployee().getId();
            Long ltId  = al.getLeaveType() != null ? al.getLeaveType().getId() : null;
            if (ltId == null) continue;

            // Find the ACTIVE allocation for this employee+type (latest year)
            List<LeaveAllocation> allocs = leaveAllocationRepository.findByEmployeeId(empId);
            LeaveAllocation activeAlloc = allocs.stream()
                    .filter(a -> a.getLeaveType() != null && a.getLeaveType().getId().equals(ltId)
                            && a.getStatus() == LeaveAllocation.AllocationStatus.ACTIVE)
                    .max((a, b) -> Integer.compare(
                            a.getYear() != null ? a.getYear() : 0,
                            b.getYear() != null ? b.getYear() : 0))
                    .orElse(null);

            if (activeAlloc == null) continue;

            double allocAvail = activeAlloc.getAvailableDays() != null ? activeAlloc.getAvailableDays() : 0.0;
            double allocCf    = activeAlloc.getCarryforwardDays() != null ? activeAlloc.getCarryforwardDays() : 0.0;
            double allocTotal  = activeAlloc.getTotalLeaveDays() != null ? activeAlloc.getTotalLeaveDays() : 0.0;

            double currentAvail = al.getAvailableDays() != null ? al.getAvailableDays() : 0.0;
            double currentTotal = al.getTotalLeaveDays() != null ? al.getTotalLeaveDays() : 0.0;

            // Only patch if the allocation has diverged from the source-of-truth
            if (Math.abs(currentAvail - allocAvail) > 0.01 || Math.abs(currentTotal - allocTotal) > 0.01) {
                al.setAvailableDays(allocAvail);
                al.setCarryforwardDays(allocCf);
                al.setTotalLeaveDays(allocTotal);
                availableLeaveRepository.save(al);
                fixed++;
                log.info("Reconciled: employee={} leaveType={} avail {}→{} cf 0→{} total {}→{}",
                        empId, ltId, currentAvail, allocAvail, allocCf, currentTotal, allocTotal);
            }
        }
        log.info("Reconciliation complete for company {}: {} rows fixed out of {} scanned", companyId, fixed, balances.size());
        return fixed;
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

        boolean skipWeekends = Boolean.TRUE.equals(leaveType.getExcludeWeekend());
        long days = 0;
        LocalDate current = start;
        while (!current.isAfter(end)) {
            if (skipWeekends
                    && (current.getDayOfWeek() == DayOfWeek.SATURDAY
                        || current.getDayOfWeek() == DayOfWeek.SUNDAY)) {
                current = current.plusDays(1);
                continue;
            }
            if (!excludedDates.contains(current)) {
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
     * Records how many days were drawn from available vs carryforward on the request (for audit).
     *
     * NOTE: the allocation (available_days / carryforward_days) is intentionally left UNCHANGED.
     * "Available Days" is the allocated/assigned amount — a constant. The remaining balance is
     * DERIVED as (totalLeaveDays − usedDays) by the /balance endpoints and the UI, never stored
     * by overwriting the allocation. See computeRemaining().
     */
    private void deductBalance(AvailableLeave balance, double days, LeaveRequest request) {
        double avail = balance.getAvailableDays() != null ? balance.getAvailableDays() : 0.0;
        if (days > avail) {
            request.setApprovedAvailableDays(avail);
            request.setApprovedCarryforwardDays(days - avail);
        } else {
            request.setApprovedAvailableDays(days);
            request.setApprovedCarryforwardDays(0.0);
        }
        // No setAvailableDays / no save — allocation stays constant; "remaining" is derived.
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
     * No-op for the stored allocation: since deductBalance() no longer decrements the allocation,
     * there is nothing to restore when a request is rejected/cancelled. The approved/used total
     * drops automatically because the request's status moves out of APPROVED (so the
     * sumApprovedDays... queries stop counting it). The per-request approved*Days audit fields
     * remain on the request for history.
     */
    private void restoreBalance(Long employeeId, Long leaveTypeId, LeaveRequest request) {
        // Intentionally empty — allocation is constant; "remaining" is derived (Total − Used).
    }

    /**
     * Computes the REAL remaining leave days for an employee+type using the same source of truth
     * as the /balance endpoints: (available + carryforward) − used, where used = sum of APPROVED
     * request days. Carryforward is capped by carryforward_max. This replaces the old pattern of
     * reading availableDays directly as "remaining" (which coupled allocation to consumption).
     */
    private double computeRemaining(AvailableLeave balance, Long employeeId, Long leaveTypeId) {
        double avail = balance.getAvailableDays() != null ? balance.getAvailableDays() : 0.0;
        double cf = resolveCarryforwardDays(balance);
        double used = 0.0;
        List<Object[]> rows = leaveRequestRepository.sumApprovedDaysByLeaveTypeForEmployee(employeeId);
        for (Object[] row : rows) {
            Long ltId = ((Number) row[0]).longValue();
            if (leaveTypeId != null && ltId != null && ltId.equals(leaveTypeId)) {
                used = ((Number) row[1]).doubleValue();
                break;
            }
        }
        return (avail + cf) - used;
    }
}
