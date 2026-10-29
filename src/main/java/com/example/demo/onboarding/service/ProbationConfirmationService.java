package com.example.demo.onboarding.service;

import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.repository.EmployeeWorkInformationRepository;
import com.example.demo.leave.entity.*;
import com.example.demo.leave.repository.*;
import com.example.demo.leave.service.LeavePeriodResolver;
import com.example.demo.onboarding.entity.*;
import com.example.demo.onboarding.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;

@Service @RequiredArgsConstructor
public class ProbationConfirmationService {
    private final ProbationPolicyRepository policies;
    private final ProbationConfirmationRepository confirmations;
    private final ProbationEligibility eligibility;
    private final EmployeeRepository employees;
    private final com.example.demo.base.repository.CompanyRepository companies;
    private final LeaveTypeRepository leaveTypes;
    private final AvailableLeaveRepository balances;
    private final LeaveAllocationRepository allocations;

    public record PolicyView(Long companyId, boolean enabled, LocalDate effectiveFrom, int probationMonths) {}
    public record EmployeeView(Long employeeId, String employeeName, LocalDate joiningDate,
            LocalDate probationEndsOn, String status, LocalDate confirmedOn) {}

    private void requireCompany(Long companyId) {
        var scope = AccessScopeContext.get();
        if (scope == null || scope.isSelfScope()
                || scope.getScope() == com.example.demo.auth.entity.UserRole.AccessScope.DEPARTMENT
                || !scope.canAccess(companyId)
                || scope.getFilterCompanyId() != null && !scope.getFilterCompanyId().equals(companyId)) {
            throw new AccessDeniedException("You do not have access to this company's probation settings");
        }
        var company = companies.findById(companyId).orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        String schema = company.isHeadOffice() ? company.getSchemaName()
                : company.getParentCompany() == null ? null : company.getParentCompany().getSchemaName();
        if (schema == null || !schema.equals(com.example.demo.common.tenant.TenantContext.getTenant()))
            throw new AccessDeniedException("Select this company in the company switcher before managing its probation policy");
    }

    @Transactional(readOnly = true)
    public PolicyView policy(Long companyId) {
        requireCompany(companyId);
        var policy = policies.findByCompanyId(companyId).orElse(null);
        return new PolicyView(companyId, policy != null && policy.isEnabled(),
                policy == null ? null : policy.getEffectiveFrom(), 6);
    }

    @Transactional
    public PolicyView savePolicy(Long companyId, boolean enabled, LocalDate effectiveFrom) {
        requireCompany(companyId);
        if (effectiveFrom == null) throw new BadRequestException("Select the earliest joining date covered by this policy");
        var policy = policies.findByCompanyId(companyId).orElseGet(ProbationPolicy::new);
        // Changing the cohort after confirmations would reinterpret historical entitlement.
        if (policy.getId() != null && !Objects.equals(policy.getEffectiveFrom(), effectiveFrom)
                && !confirmations.findByCompanyId(companyId).isEmpty()) {
            throw new BadRequestException("The effective joining date cannot change after employees have been confirmed");
        }
        policy.setCompanyId(companyId);
        policy.setEnabled(enabled);
        policy.setEffectiveFrom(effectiveFrom);
        policies.save(policy);
        return new PolicyView(companyId, enabled, effectiveFrom, 6);
    }

    @Transactional(readOnly = true)
    public List<EmployeeView> list(Long companyId, LocalDate today) {
        requireCompany(companyId);
        var policy = policies.findByCompanyId(companyId).orElse(null);
        var confirmed = confirmations.findByCompanyId(companyId).stream()
                .collect(java.util.stream.Collectors.toMap(ProbationConfirmation::getEmployeeId, c -> c));
        return employees.findByCompanyIdAndIsActiveTrue(companyId).stream().map(employee -> {
            LocalDate joining = eligibility.joiningDate(employee);
            var confirmation = confirmed.get(employee.getId());
            boolean applies = eligibility.applies(policy, joining);
            LocalDate due = joining == null ? null : joining.plusMonths(6);
            String status = confirmation != null ? "CONFIRMED" : joining == null ? "JOINING_DATE_REQUIRED"
                    : !applies ? "NOT_COVERED" : due.isAfter(today) ? "ON_PROBATION" : "AWAITING_PROCESSING";
            return new EmployeeView(employee.getId(), (employee.getFirstName() + " "
                    + Objects.toString(employee.getLastName(), "")).trim(), joining, due, status,
                    confirmation == null ? null : confirmation.getConfirmedOn());
        }).toList();
    }

    /** One transaction per employee: confirmation and entitlements either both commit or neither does. */
    @Transactional
    public boolean confirmIfDue(Long employeeId, LocalDate today) {
        Employee employee = employees.findByIdForProbationConfirmation(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));
        if (!employee.isActive() || !employee.getCompany().isActive()
                || employee.getCompany().getStatus() != com.example.demo.base.entity.Company.CompanyStatus.ACTIVE
                || confirmations.findByEmployeeId(employeeId).isPresent()) return false;
        var policy = policies.findByCompanyId(employee.getCompany().getId()).orElse(null);
        LocalDate joining = eligibility.joiningDate(employee);
        if (!eligibility.applies(policy, joining)) return false;
        LocalDate due = joining.plusMonths(6);
        if (due.isAfter(today)) return false;

        // Scope comes from the employee's own company, never from an administrator's current selection.
        for (LeaveType type : leaveTypes.findAll()) {
            if (!applicable(type, employee)) continue;
            provisionEntitlement(employee, type, due, today);
        }
        ProbationConfirmation confirmation = new ProbationConfirmation();
        confirmation.setEmployeeId(employeeId);
        confirmation.setCompanyId(employee.getCompany().getId());
        confirmation.setConfirmedOn(due);
        confirmation.setProcessedOn(today);
        confirmations.save(confirmation);
        return true;
    }

    private boolean applicable(LeaveType type, Employee employee) {
        if (!type.isActive() || type.getCompany() == null) return false;
        Long companyId = employee.getCompany().getId();
        Long parentId = employee.getCompany().getParentCompanyId();
        if (!Objects.equals(type.getCompany().getId(), companyId)
                && !(Boolean.TRUE.equals(type.getIsOrganizationWide())
                    && Objects.equals(type.getCompany().getId(), parentId))) return false;
        return eligibility.applicableCategory(employee, type);
    }

    private void provisionEntitlement(Employee employee, LeaveType type, LocalDate due, LocalDate today) {
        // Never overwrite used, imported, or previously credited balances.
        if (balances.findByEmployeeIdAndLeaveTypeId(employee.getId(), type.getId()).isPresent()) return;
        var period = LeavePeriodResolver.containing(type, today);
        if (allocations.findByEmployeeIdAndLeaveTypeIdAndYear(employee.getId(), type.getId(), period.start().getYear()).isPresent()) return;
        boolean monthly = Boolean.TRUE.equals(type.getAccrualEnabled());
        double days = monthly ? 0 : upfrontDays(type, due, period);
        AvailableLeave balance = new AvailableLeave();
        balance.setEmployee(employee); balance.setLeaveType(type); balance.setAvailableDays(days);
        balance.setAssignedDate(due);
        if (Boolean.TRUE.equals(type.getReset())) balance.setResetDate(balance.computeNextResetDate(today));
        if (type.getCarryforwardType() == LeaveType.CarryforwardType.CARRYFORWARD_EXPIRE)
            balance.setExpiredDate(type.getCarryforwardExpireDate());
        balances.save(balance);
        if (!monthly) {
            LeaveAllocation allocation = new LeaveAllocation();
            allocation.setEmployee(employee); allocation.setLeaveType(type); allocation.setCompany(employee.getCompany());
            allocation.setYear(period.start().getYear()); allocation.setTotalLeaveDays(days); allocation.setAvailableDays(days);
            allocation.setCarryforwardDays(0.0);
            allocations.save(allocation);
        }
    }

    static double upfrontDays(LeaveType type, LocalDate eligibleFrom, LeavePeriodResolver.Period period) {
        double annual = type.getTotalDays() == null ? 0 : Math.max(0, type.getTotalDays());
        if (type.getMidYearJoinerMode() != LeaveType.MidYearJoinerMode.AUTO_PRORATA) return annual;
        LocalDate start = eligibleFrom.isAfter(period.start()) ? eligibleFrom : period.start();
        if (start.isAfter(period.end())) return 0;
        boolean workingDays = type.getAccrualProrationBasis() == LeaveType.AccrualProrationBasis.WORKING_DAYS;
        long total = eligibleDays(period.start(), period.end(), workingDays);
        long remaining = eligibleDays(start, period.end(), workingDays);
        if (total == 0) return 0;
        return Math.round(annual * remaining / total * 100.0) / 100.0;
    }

    private static long eligibleDays(LocalDate start, LocalDate end, boolean workingDays) {
        if (!workingDays) return ChronoUnit.DAYS.between(start, end) + 1;
        return start.datesUntil(end.plusDays(1)).filter(d -> d.getDayOfWeek() != java.time.DayOfWeek.SATURDAY
                && d.getDayOfWeek() != java.time.DayOfWeek.SUNDAY).count();
    }
}
