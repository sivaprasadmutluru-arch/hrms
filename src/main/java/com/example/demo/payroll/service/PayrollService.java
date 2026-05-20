package com.example.demo.payroll.service;

import com.example.demo.attendance.repository.AttendanceLateComeEarlyOutRepository;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.service.EmailService;
import com.example.demo.common.event.PayslipGeneratedEvent;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.entity.LeaveAllocation;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.entity.LeaveType;
import com.example.demo.leave.repository.LeaveAllocationRepository;
import com.example.demo.leave.repository.LeaveRequestRepository;
import com.example.demo.attendance.entity.WorkRecord;
import com.example.demo.attendance.repository.WorkRecordRepository;
import com.example.demo.payroll.entity.*;
import com.example.demo.payroll.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.expression.Expression;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;
import java.time.Year;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollService {

    private final EmployeeRepository employeeRepository;
    private final ContractRepository contractRepository;
    private final AllowanceRepository allowanceRepository;
    private final DeductionRepository deductionRepository;
    private final LoanAccountRepository loanAccountRepository;
    private final ReimbursementRepository reimbursementRepository;
    private final TaxBracketRepository taxBracketRepository;
    private final FilingStatusRepository filingStatusRepository;
    private final PayslipRepository payslipRepository;
    private final CompanyRepository companyRepository;
    private final LeaveAllocationRepository leaveAllocationRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final WorkRecordRepository workRecordRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceLateComeEarlyOutRepository lateComeEarlyOutRepository;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final EmailService emailService;

    // ── Operator mapping (mirrors GCP operator_mapping) ──────────────────────
    private boolean applyOperator(String op, Comparable<Object> val, Object condVal) {
        try {
            //noinspection unchecked
            return switch (op) {
                case "equal"    -> val.compareTo(condVal) == 0;
                case "notequal" -> val.compareTo(condVal) != 0;
                case "lt"       -> val.compareTo(condVal) < 0;
                case "gt"       -> val.compareTo(condVal) > 0;
                case "le"       -> val.compareTo(condVal) <= 0;
                case "ge"       -> val.compareTo(condVal) >= 0;
                case "icontains"-> val.toString().toLowerCase().contains(condVal.toString().toLowerCase());
                default         -> false;
            };
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Resolve an employee attribute by field name (mirrors GCP dynamic_attr).
     * Supports: gender, marital_status, department, job_position, job_role,
     *           work_type_id, shift_id, children, experience, country, employee_type
     */
    private Object resolveEmployeeAttribute(Employee employee, String field) {
        return switch (field.toLowerCase().replace("-", "_")) {
            case "gender"                   -> employee.getGender() != null ? employee.getGender().name().toLowerCase() : null;
            case "marital_status",
                 "maritalstatus"            -> employee.getMaritalStatus() != null ? employee.getMaritalStatus().name().toLowerCase() : null;
            case "department",
                 "department_id"            -> employee.getDepartment() != null ? employee.getDepartment().getName() : null;
            case "job_position",
                 "job_position_id"          -> employee.getJobPosition() != null ? employee.getJobPosition().getId().toString() : null;
            case "job_role",
                 "job_role_id"              -> employee.getJobRole() != null ? employee.getJobRole().getId().toString() : null;
            case "work_type",
                 "work_type_id"             -> employee.getWorkType() != null ? employee.getWorkType().getId().toString() : null;
            case "shift",
                 "shift_id"                 -> employee.getShift() != null ? employee.getShift().getId().toString() : null;
            case "children"                 -> employee.getChildren();
            case "experience"               -> employee.getExperience();
            case "country"                  -> employee.getCountry();
            case "employee_type",
                 "employeetype"             -> employee.getEmployeeType() != null ? employee.getEmployeeType().name().toLowerCase() : null;
            default -> null;
        };
    }

    /**
     * Evaluate all conditions for an allowance/deduction (mirrors GCP condition evaluation).
     * Returns true if all conditions pass.
     */
    private boolean evaluateConditions(Employee employee, String field, String conditionOp, String conditionVal,
                                       Set<MultipleCondition> otherConditions) {
        // Build list of all conditions: otherConditions + primary condition
        List<Object[]> conditions = new ArrayList<>();
        if (otherConditions != null) {
            for (MultipleCondition mc : otherConditions) {
                String mcOp = conditionTypeToOp(mc.getConditionType());
                conditions.add(new Object[]{mc.getField(), mcOp, mc.getValue()});
            }
        }
        if (field != null && conditionOp != null && conditionVal != null) {
            conditions.add(new Object[]{field, conditionOp, conditionVal.toLowerCase().replace(" ", "_")});
        }

        for (Object[] cond : conditions) {
            String cField = (String) cond[0];
            String cOp    = (String) cond[1];
            String cVal   = (String) cond[2];
            Object empVal = resolveEmployeeAttribute(employee, cField);
            if (empVal == null) return false;

            // Coerce condition value to same type as employee value
            try {
                if (empVal instanceof Integer intVal) {
                    int condInt = Integer.parseInt(cVal);
                    //noinspection unchecked
                    if (!applyOperator(cOp, (Comparable<Object>)(Comparable<?>)intVal, condInt)) return false;
                } else if (empVal instanceof Long longVal) {
                    long condLong = Long.parseLong(cVal);
                    //noinspection unchecked
                    if (!applyOperator(cOp, (Comparable<Object>)(Comparable<?>)longVal, condLong)) return false;
                } else {
                    String empStr = empVal.toString().toLowerCase().replace(" ", "_");
                    String condStr = cVal.toLowerCase().replace(" ", "_");
                    //noinspection unchecked
                    if (!applyOperator(cOp, (Comparable<Object>)(Comparable<?>)empStr, condStr)) return false;
                }
            } catch (NumberFormatException e) {
                String empStr = empVal.toString().toLowerCase().replace(" ", "_");
                String condStr = cVal.toLowerCase().replace(" ", "_");
                //noinspection unchecked
                if (!applyOperator(cOp, (Comparable<Object>)(Comparable<?>)empStr, condStr)) return false;
            }
        }
        return true;
    }

    private String conditionTypeToOp(MultipleCondition.ConditionType ct) {
        if (ct == null) return "equal";
        return switch (ct) {
            case EQUAL                -> "equal";
            case NOT_EQUAL            -> "notequal";
            case GREATER_THAN         -> "gt";
            case LESS_THAN            -> "lt";
            case GREATER_THAN_OR_EQUAL-> "ge";
            case LESS_THAN_OR_EQUAL   -> "le";
            case CONTAINS             -> "icontains";
        };
    }

    /**
     * Apply the if_condition gate (mirrors GCP if_condition_on).
     * Returns 0 if the condition fails, else returns amount unchanged.
     */
    private double applyIfCondition(double amount, String ifChoice, String ifCondition,
                                    Double ifAmount, Double startRange, Double endRange,
                                    double basicPay, double grossPay) {
        double conditionValue = "basic_pay".equals(ifChoice) ? basicPay : grossPay;
        double threshold = ifAmount != null ? ifAmount : 0.0;

        if ("range".equals(ifCondition)) {
            double lo = startRange != null ? startRange : 0.0;
            double hi = endRange   != null ? endRange   : Double.MAX_VALUE;
            if (conditionValue < lo || conditionValue > hi) return 0.0;
        } else {
            boolean pass = switch (ifCondition != null ? ifCondition : "gt") {
                case "equal"    -> conditionValue == threshold;
                case "notequal" -> conditionValue != threshold;
                case "lt"       -> conditionValue < threshold;
                case "gt"       -> conditionValue > threshold;
                case "le"       -> conditionValue <= threshold;
                case "ge"       -> conditionValue >= threshold;
                default         -> true;
            };
            if (!pass) return 0.0;
        }
        return amount;
    }

    /**
     * Apply max limit on a computed amount (mirrors GCP compute_limit).
     */
    private double applyMaxLimit(double amount, Boolean hasMaxLimit, Double maximumAmount) {
        if (Boolean.TRUE.equals(hasMaxLimit) && maximumAmount != null && maximumAmount > 0) {
            return Math.min(amount, maximumAmount);
        }
        return amount;
    }

    /**
     * Calculate the amount for a non-fixed allowance/deduction based on basedOn field.
     */
    private double calculateByBasedOn(String basedOn, double basicPay, double grossPay, double rate,
                                      double perAttendance, double shiftPerAttendance,
                                      double workTypePerAttendance, double amountPerOneHr,
                                      double perChildrenAmount,
                                      Employee employee, LocalDate startDate, LocalDate endDate,
                                      Long shiftId, Long workTypeId) {
        if (basedOn == null) basedOn = "basic_pay";
        return switch (basedOn) {
            case "basic_pay"   -> basicPay * rate / 100.0;
            case "gross_pay"   -> grossPay * rate / 100.0;
            case "attendance"  -> {
                long count = attendanceRepository.countValidatedByEmployeeAndPeriod(
                        employee.getId(), startDate, endDate);
                yield count * perAttendance;
            }
            case "shift_id"    -> {
                if (shiftId == null) yield 0.0;
                long count = attendanceRepository.countValidatedByEmployeeAndPeriodAndShift(
                        employee.getId(), startDate, endDate, shiftId);
                yield count * shiftPerAttendance;
            }
            case "work_type_id" -> {
                if (workTypeId == null) yield 0.0;
                long count = attendanceRepository.countValidatedByEmployeeAndPeriodAndWorkType(
                        employee.getId(), startDate, endDate, workTypeId);
                yield count * workTypePerAttendance;
            }
            case "overtime"    -> {
                long totalOvertimeSec = attendanceRepository.sumApprovedOvertimeSecondsByEmployeeAndPeriod(
                        employee.getId(), startDate, endDate);
                yield (totalOvertimeSec / 3600.0) * amountPerOneHr;
            }
            case "children"    -> {
                int children = employee.getChildren() != null ? employee.getChildren() : 0;
                yield children * perChildrenAmount;
            }
            // FIX #8: late-come based deductions — amount per late occurrence using perAttendance field
            case "late_come"   -> {
                long count = lateComeEarlyOutRepository.countLateComesForEmployee(
                        employee.getId(), startDate, endDate);
                yield count * perAttendance;
            }
            default -> 0.0;
        };
    }

    /**
     * Gather all applicable allowances for the employee (mirrors GCP calculate_allowance targeting).
     * Combines: specificEmployees + (isConditionBased & !excluded) + (includeActiveEmployees & !excluded)
     * Then filters by oneTimeDate range and applies condition evaluation.
     */
    private List<Allowance> gatherApplicableAllowances(Employee employee, Long companyId,
                                                        LocalDate startDate, LocalDate endDate) {
        List<Allowance> specific    = allowanceRepository.findSpecificForEmployee(employee.getId(), companyId);
        List<Allowance> conditional = allowanceRepository.findConditionalNotExcluded(employee.getId(), companyId);
        List<Allowance> active      = allowanceRepository.findActiveEmployeeNotExcluded(employee.getId(), companyId);

        // Union with deduplication
        Map<Long, Allowance> combined = new LinkedHashMap<>();
        for (Allowance a : specific)    combined.put(a.getId(), a);
        for (Allowance a : conditional) combined.put(a.getId(), a);
        for (Allowance a : active)      combined.put(a.getId(), a);

        // Filter by oneTimeDate range (null = always applicable)
        List<Allowance> filtered = combined.values().stream()
                .filter(a -> a.getOneTimeDate() == null
                        || (!a.getOneTimeDate().isBefore(startDate) && !a.getOneTimeDate().isAfter(endDate)))
                .collect(Collectors.toList());

        // Apply condition evaluation for isConditionBased allowances
        List<Allowance> applicable = new ArrayList<>();
        for (Allowance a : filtered) {
            if (Boolean.TRUE.equals(a.getIsConditionBased())) {
                boolean passes = evaluateConditions(employee, a.getField(), a.getCondition(), a.getValue(),
                        a.getOtherConditions());
                if (passes) applicable.add(a);
            } else {
                // For non-condition-based, also check filter_mapping (based_on: attendance/shift/work_type)
                // These require at least one matching attendance record to be applicable
                String basedOn = a.getBasedOn();
                if (basedOn != null && isAttendanceBasedOn(basedOn)) {
                    // Verify the employee has at least one relevant attendance in the period
                    if (hasRelevantAttendance(employee, a, startDate, endDate)) {
                        applicable.add(a);
                    }
                } else {
                    applicable.add(a);
                }
            }
        }
        return applicable;
    }

    private boolean isAttendanceBasedOn(String basedOn) {
        return "attendance".equals(basedOn) || "shift_id".equals(basedOn)
                || "work_type_id".equals(basedOn) || "overtime".equals(basedOn)
                || "late_come".equals(basedOn);
    }

    private boolean hasRelevantAttendance(Employee employee, Allowance a, LocalDate startDate, LocalDate endDate) {
        String basedOn = a.getBasedOn();
        if ("attendance".equals(basedOn)) {
            return attendanceRepository.countValidatedByEmployeeAndPeriod(employee.getId(), startDate, endDate) > 0;
        } else if ("shift_id".equals(basedOn) && a.getShift() != null) {
            return attendanceRepository.countValidatedByEmployeeAndPeriodAndShift(
                    employee.getId(), startDate, endDate, a.getShift().getId()) > 0;
        } else if ("work_type_id".equals(basedOn) && a.getWorkType() != null) {
            return attendanceRepository.countValidatedByEmployeeAndPeriodAndWorkType(
                    employee.getId(), startDate, endDate, a.getWorkType().getId()) > 0;
        } else if ("overtime".equals(basedOn)) {
            return attendanceRepository.sumApprovedOvertimeSecondsByEmployeeAndPeriod(
                    employee.getId(), startDate, endDate) > 0;
        } else if ("late_come".equals(basedOn)) {
            return lateComeEarlyOutRepository.countLateComesForEmployee(
                    employee.getId(), startDate, endDate) > 0;
        }
        return false;
    }

    /**
     * Gather all applicable deductions for the employee (mirrors GCP targeting).
     * Excludes deductions with update_compensation set (those are handled separately).
     */
    private List<Deduction> gatherApplicableDeductions(Employee employee, Long companyId,
                                                        LocalDate startDate, LocalDate endDate,
                                                        boolean excludeUpdateCompensation) {
        List<Deduction> specific    = deductionRepository.findSpecificForEmployee(employee.getId(), companyId);
        List<Deduction> conditional = deductionRepository.findConditionalNotExcluded(employee.getId(), companyId);
        List<Deduction> active      = deductionRepository.findActiveEmployeeNotExcluded(employee.getId(), companyId);

        Map<Long, Deduction> combined = new LinkedHashMap<>();
        for (Deduction d : specific)    combined.put(d.getId(), d);
        for (Deduction d : conditional) combined.put(d.getId(), d);
        for (Deduction d : active)      combined.put(d.getId(), d);

        // Filter by oneTimeDate range
        List<Deduction> filtered = combined.values().stream()
                .filter(d -> d.getOneTimeDate() == null
                        || (!d.getOneTimeDate().isBefore(startDate) && !d.getOneTimeDate().isAfter(endDate)))
                .filter(d -> !excludeUpdateCompensation || d.getUpdateCompensation() == null)
                .collect(Collectors.toList());

        // Apply condition evaluation for isConditionBased deductions
        List<Deduction> applicable = new ArrayList<>();
        for (Deduction d : filtered) {
            if (Boolean.TRUE.equals(d.getIsConditionBased())) {
                boolean passes = evaluateConditions(employee, d.getField(), d.getCondition(), d.getValue(),
                        d.getOtherConditions());
                if (passes) applicable.add(d);
            } else {
                applicable.add(d);
            }
        }
        return applicable;
    }

    /**
     * Compute the amount for an allowance (applying if_condition gate and max limit).
     */
    private double computeAllowanceAmount(Allowance a, double basicPay, double grossPay,
                                          Employee employee, LocalDate startDate, LocalDate endDate) {
        double amount;
        if (Boolean.TRUE.equals(a.getIsFixed())) {
            amount = a.getAmount() != null ? a.getAmount() : 0.0;
        } else {
            Long shiftId    = a.getShift()    != null ? a.getShift().getId()    : null;
            Long workTypeId = a.getWorkType() != null ? a.getWorkType().getId() : null;
            amount = calculateByBasedOn(
                    a.getBasedOn(), basicPay, grossPay,
                    a.getRate()                       != null ? a.getRate()                       : 0.0,
                    a.getPerAttendanceFixedAmount()   != null ? a.getPerAttendanceFixedAmount()   : 0.0,
                    a.getShiftPerAttendanceAmount()   != null ? a.getShiftPerAttendanceAmount()   : 0.0,
                    a.getWorkTypePerAttendanceAmount() != null ? a.getWorkTypePerAttendanceAmount(): 0.0,
                    a.getAmountPerOneHr()             != null ? a.getAmountPerOneHr()             : 0.0,
                    a.getPerChildrenFixedAmount()     != null ? a.getPerChildrenFixedAmount()     : 0.0,
                    employee, startDate, endDate, shiftId, workTypeId
            );
        }
        amount = applyMaxLimit(amount, a.getHasMaxLimit(), a.getMaximumAmount());
        // GCP if_condition_on: for Allowances, gross_pay is always 0 (not computed)
        amount = applyIfCondition(amount,
                a.getIfChoice(), a.getIfCondition(),
                a.getIfAmount(), a.getStartRange(), a.getEndRange(),
                basicPay, 0.0);
        return amount;
    }

    /**
     * Compute the amount for a deduction (applying if_condition gate and max limit).
     */
    private double computeDeductionAmount(Deduction d, double basicPay, double grossPay, double netPay,
                                          Employee employee, LocalDate startDate, LocalDate endDate) {
        double amount;
        if (Boolean.TRUE.equals(d.getIsFixed())) {
            amount = d.getAmount() != null ? d.getAmount() : 0.0;
        } else {
            String basedOn = d.getBasedOn();
            if ("net_pay".equals(basedOn)) {
                amount = netPay * (d.getRate() != null ? d.getRate() : 0.0) / 100.0;
            } else {
                amount = calculateByBasedOn(
                        basedOn, basicPay, grossPay,
                        d.getRate()          != null ? d.getRate()          : 0.0,
                        0.0, 0.0, 0.0, 0.0, 0.0,
                        employee, startDate, endDate, null, null
                );
            }
        }
        amount = applyMaxLimit(amount, d.getHasMaxLimit(), d.getMaximumAmount());
        amount = applyIfCondition(amount,
                d.getIfChoice(), d.getIfCondition(),
                d.getIfAmount(), d.getStartRange(), d.getEndRange(),
                basicPay, grossPay);
        return amount;
    }

    /**
     * Generate a payslip for one employee for the given pay period.
     * Mirrors GCP payroll_calculation() with full condition-based targeting,
     * if_condition gate, 5 deduction buckets, and GCP-exact pay_head_data JSON.
     */
    @Transactional
    public Payslip generatePayslip(Long employeeId, LocalDate startDate, LocalDate endDate, Long companyId) {
        return generatePayslip(employeeId, startDate, endDate, companyId, false, true, true);
    }

    /** Overload that lets callers mark the payslip as auto-generated at creation time (avoids a second save). */
    @Transactional
    public Payslip generatePayslip(Long employeeId, LocalDate startDate, LocalDate endDate, Long companyId, boolean autoGenerated) {
        return generatePayslip(employeeId, startDate, endDate, companyId, autoGenerated, true, true);
    }

    /** Overload with configurable weekend days — uses default late deduction rate (0.5). */
    @Transactional
    public Payslip generatePayslip(Long employeeId, LocalDate startDate, LocalDate endDate, Long companyId, boolean autoGenerated, boolean weekendSat, boolean weekendSun) {
        return generatePayslip(employeeId, startDate, endDate, companyId, autoGenerated, weekendSat, weekendSun, 0.5);
    }

    /** Full overload with configurable weekend days and configurable late deduction rate. */
    @Transactional
    public Payslip generatePayslip(Long employeeId, LocalDate startDate, LocalDate endDate, Long companyId, boolean autoGenerated, boolean weekendSat, boolean weekendSun, double lateDeductionRate) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));

        // Check for existing payslip to avoid duplicates
        List<Payslip> existing = payslipRepository.findByEmployeeIdAndStartDateBetween(employeeId, startDate, startDate);
        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        // ── 1. Basic Pay from active contract ───────────────────────────────
        Contract contract = contractRepository
                .findByEmployeeIdAndContractStatus(employeeId, Contract.ContractStatus.ACTIVE)
                .orElse(null);

        double contractWage = 0.0;
        double basicPay     = 0.0;
        double workedUnits  = 0.0;
        Contract.WageType wageType = Contract.WageType.MONTHLY;

        // Pre-compute working-day counts used by wage calculation, LOP, and pro-rata (all wage types need these)
        Set<DayOfWeek> weekendDays = new HashSet<>();
        if (weekendSat) weekendDays.add(DayOfWeek.SATURDAY);
        if (weekendSun)  weekendDays.add(DayOfWeek.SUNDAY);
        int workingDaysInMonth  = countWorkingDays(startDate.withDayOfMonth(1),
                startDate.withDayOfMonth(startDate.lengthOfMonth()), weekendDays);
        int workingDaysInPeriod = countWorkingDays(startDate, endDate, weekendDays);

        if (contract != null && contract.getWage() != null) {
            contractWage = contract.getWage().doubleValue();
            wageType = contract.getWageType() != null ? contract.getWageType() : Contract.WageType.MONTHLY;

            if (wageType == Contract.WageType.HOURLY) {
                // GCP hourly_computation: sum (at_work_second - overtime_second) — overtime excluded from basic pay
                long netWorkedSec = attendanceRepository.sumNetWorkedSecondsByEmployeeAndPeriod(employeeId, startDate, endDate);
                workedUnits = netWorkedSec / 3600.0;
                basicPay = contractWage * workedUnits;
            } else if (wageType == Contract.WageType.DAILY) {
                // GCP daily_computation: wage × total_working_days (schedule-based, not attendance-based)
                workedUnits = workingDaysInPeriod;
                basicPay = contractWage * workingDaysInPeriod;
            } else {
                // MONTHLY — prorate by working days (mirrors GCP months_between_range: working_days_on_period * per_day_amount)
                double perDayAmount = workingDaysInMonth > 0 ? contractWage / workingDaysInMonth : contractWage;
                basicPay = perDayAmount * workingDaysInPeriod;
            }
        }

        // ── 1b. Leave data (always fetched — used for both LOP deduction and attendance summary) ─
        long periodDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        int  monthDays  = YearMonth.of(startDate.getYear(), startDate.getMonth()).lengthOfMonth();

        List<LeaveRequest> approvedLeaves = leaveRequestRepository
                .findApprovedOverlapping(employeeId, startDate, endDate);

        // Remaining leave balance — sum of active allocations for the payroll year
        List<LeaveAllocation> leaveAllocations = leaveAllocationRepository.findByEmployeeId(employeeId);
        double totalLeaveBalance = leaveAllocations.stream()
                .filter(la -> la.getStatus() == LeaveAllocation.AllocationStatus.ACTIVE
                           && (la.getYear() == null || la.getYear() == startDate.getYear()))
                .mapToDouble(la -> la.getAvailableDays() != null ? la.getAvailableDays() : 0.0)
                .sum();

        // Paid leave days (for attendance summary display)
        double paidLeaveDays = approvedLeaves.stream()
                .filter(lr -> lr.getLeaveType() != null
                        && LeaveType.PaymentType.PAID == lr.getLeaveType().getPaymentType())
                .mapToDouble(lr -> lr.getRequestedDays() != null
                        ? lr.getRequestedDays()
                        : (lr.getStartDate() != null && lr.getEndDate() != null
                           ? ChronoUnit.DAYS.between(lr.getStartDate(), lr.getEndDate()) + 1
                           : 0))
                .sum();

        double lossOfPay  = 0.0;
        double unpaidDays = 0.0;
        double paidDays;

        if (contract != null && !Boolean.FALSE.equals(contract.getDeductLeaveFromBasicPay())) {
            unpaidDays = approvedLeaves.stream()
                    .filter(lr -> lr.getLeaveType() != null
                            && LeaveType.PaymentType.UNPAID == lr.getLeaveType().getPaymentType())
                    .mapToDouble(lr -> lr.getRequestedDays() != null
                            ? lr.getRequestedDays()
                            : (lr.getStartDate() != null && lr.getEndDate() != null
                               ? ChronoUnit.DAYS.between(lr.getStartDate(), lr.getEndDate()) + 1
                               : 0))
                    .sum();
            if (unpaidDays > 0) {
                double dailyRate;
                if (Boolean.TRUE.equals(contract.getCalculateDailyLeaveAmount())) {
                    // GCP: daily rate = wage / working_days_in_month (not calendar days)
                    dailyRate = workingDaysInMonth > 0 ? contractWage / workingDaysInMonth : 0.0;
                } else if (contract.getDeductionForOneLeaveAmount() != null
                        && contract.getDeductionForOneLeaveAmount().compareTo(BigDecimal.ZERO) > 0) {
                    dailyRate = contract.getDeductionForOneLeaveAmount().doubleValue();
                } else {
                    dailyRate = 0.0;
                }
                lossOfPay = round2(dailyRate * unpaidDays);
            }
        }
        // GCP monthly_computation: paid_days = working_days_on_period - unpaid_leaves (not calendar days)
        paidDays = workingDaysInPeriod - unpaidDays;
        basicPay = round2(basicPay);

        // ── 1c. Attendance Summary ─────────────────────────────────────────────
        long presentDays   = attendanceRepository.countAttendanceByEmployeeAndPeriod(employeeId, startDate, endDate);
        long lateComing    = lateComeEarlyOutRepository.countLateComesForEmployee(employeeId, startDate, endDate);
        long earlyLeaving  = lateComeEarlyOutRepository.countEarlyOutsForEmployee(employeeId, startDate, endDate);
        long approvedOtSec = attendanceRepository.sumApprovedOvertimeSecondsByEmployeeAndPeriod(employeeId, startDate, endDate);
        double overtimeHours = round2(approvedOtSec / 3600.0);
        long absentDays    = Math.max(0L, (long) workingDaysInPeriod - presentDays - Math.round(paidLeaveDays));

        // Late-coming deduction: configurable fraction of a day's pay per late instance
        double dailyRateForLate = workingDaysInPeriod > 0 ? basicPay / workingDaysInPeriod : 0.0;
        double lateDeduction    = lateComing > 0 ? round2(lateComing * dailyRateForLate * lateDeductionRate) : 0.0;

        // ── 2. Basic-pay compensation deductions ─────────────────────────────
        // GCP update_compensation_deduction: only specific_employees, not conditional/active
        List<Deduction> allDeductions = gatherApplicableDeductions(employee, companyId, startDate, endDate, false);
        List<Deduction> compensationDeductions = deductionRepository
                .findCompensationDeductionsForEmployee(employee.getId(), companyId)
                .stream()
                .filter(d -> d.getOneTimeDate() == null
                        || (!d.getOneTimeDate().isBefore(startDate) && !d.getOneTimeDate().isAfter(endDate)))
                .collect(Collectors.toList());
        List<Map<String, Object>> basicPayDeductionLines = new ArrayList<>();
        for (Deduction d : compensationDeductions) {
            if ("basic_pay".equals(d.getUpdateCompensation())) {
                double amt = computeDeductionAmount(d, basicPay, 0.0, 0.0, employee, startDate, endDate);
                if (amt > 0) {
                    basicPay = Math.max(0.0, basicPay - amt);
                    basicPayDeductionLines.add(deductionLine(d, amt));
                }
            }
        }
        basicPay = round2(basicPay);

        // ── 3. Allowances ─────────────────────────────────────────────────────
        // FIX #7: use working days for both numerator and denominator so a full-month employee
        // gets proRataFactor = 1.0 (paidDays and workingDaysInMonth are both in working days)
        double proRataFactor      = workingDaysInMonth > 0 ? paidDays / workingDaysInMonth : 1.0;
        double housingAllowance   = round2((contract != null && contract.getHousingAllowance()   != null ? contract.getHousingAllowance().doubleValue()   : 0.0) * proRataFactor);
        double transportAllowance = round2((contract != null && contract.getTransportAllowance() != null ? contract.getTransportAllowance().doubleValue() : 0.0) * proRataFactor);
        double otherAllowance     = round2((contract != null && contract.getOtherAllowance()     != null ? contract.getOtherAllowance().doubleValue()     : 0.0) * proRataFactor);

        List<Allowance> applicableAllowances = gatherApplicableAllowances(employee, companyId, startDate, endDate);
        List<Map<String, Object>> allowanceLines = new ArrayList<>();
        double totalDynamicAllowance = 0.0;

        // Two-pass allowance calculation:
        // Pass 1: allowances whose if_condition does not depend on gross_pay — compute accurately
        // Pass 2: allowances whose if_condition depends on gross_pay — use pass-1 gross estimate
        List<Allowance> grossPayGated = new ArrayList<>();
        for (Allowance a : applicableAllowances) {
            if ("gross_pay".equals(a.getIfChoice())) {
                grossPayGated.add(a);
                continue;
            }
            double amt = computeAllowanceAmount(a, basicPay, basicPay, employee, startDate, endDate);
            totalDynamicAllowance += amt;
            allowanceLines.add(Map.of(
                    "allowance_id", a.getId(),
                    "title",        a.getTitle(),
                    "is_taxable",   Boolean.TRUE.equals(a.getIsTaxable()),
                    "amount",       round2(amt)
            ));
        }
        // Gross estimate for pass 2: basicPay + contract allowances + pass-1 dynamic allowances
        double grossEstimate = round2(basicPay + totalDynamicAllowance + housingAllowance + transportAllowance + otherAllowance);
        for (Allowance a : grossPayGated) {
            double amt = computeAllowanceAmount(a, basicPay, grossEstimate, employee, startDate, endDate);
            totalDynamicAllowance += amt;
            allowanceLines.add(Map.of(
                    "allowance_id", a.getId(),
                    "title",        a.getTitle(),
                    "is_taxable",   Boolean.TRUE.equals(a.getIsTaxable()),
                    "amount",       round2(amt)
            ));
        }

        // ── 4. Gross Pay ──────────────────────────────────────────────────────
        double grossPay = round2(basicPay + totalDynamicAllowance + housingAllowance + transportAllowance + otherAllowance);

        // ── 4b. Gross-pay compensation deductions ────────────────────────────
        List<Map<String, Object>> grossPayDeductionLines = new ArrayList<>();
        for (Deduction d : compensationDeductions) {
            if ("gross_pay".equals(d.getUpdateCompensation())) {
                double amt = computeDeductionAmount(d, basicPay, grossPay, 0.0, employee, startDate, endDate);
                if (amt > 0) {
                    grossPay = Math.max(0.0, grossPay - amt);
                    grossPayDeductionLines.add(deductionLine(d, amt));
                }
            }
        }
        grossPay = round2(grossPay);

        // ── 5. Taxable gross pay ──────────────────────────────────────────────
        // taxableGrossPay = grossPay - nonTaxableAllowances - preTaxDeductions
        double nonTaxableAllowanceTotal = allowanceLines.stream()
                .filter(l -> Boolean.FALSE.equals(l.get("is_taxable")))
                .mapToDouble(l -> (double) l.get("amount"))
                .sum();

        // ── 6. Deduction buckets ──────────────────────────────────────────────
        List<Map<String, Object>> pretaxDeductionLines     = new ArrayList<>();
        List<Map<String, Object>> taxDeductionLines        = new ArrayList<>();
        List<Map<String, Object>> postTaxDeductionLines    = new ArrayList<>();
        List<Map<String, Object>> netDeductionLines        = new ArrayList<>();

        double totalPretax   = 0.0;
        double totalTax      = 0.0;
        double totalPostTax  = 0.0;

        // Regular deductions (updateCompensation IS NULL)
        for (Deduction d : allDeductions) {
            if (d.getUpdateCompensation() != null) continue; // handled above

            double amt = computeDeductionAmount(d, basicPay, grossPay, 0.0, employee, startDate, endDate);

            double empRate = d.getEmployerRate() != null ? d.getEmployerRate() : 0.0;
            if (Boolean.TRUE.equals(d.getIsPretax()) && !Boolean.TRUE.equals(d.getIsTax())) {
                // Pretax deductions
                totalPretax += amt;
                pretaxDeductionLines.add(deductionLineWithContribution(d, amt, empRate));
            } else if (!Boolean.TRUE.equals(d.getIsPretax()) && Boolean.TRUE.equals(d.getIsTax())) {
                // Tax deductions
                totalTax += amt;
                Map<String, Object> taxLine = new LinkedHashMap<>();
                taxLine.put("deduction_id",                d.getId());
                taxLine.put("title",                       d.getTitle());
                taxLine.put("is_tax",                      true);
                taxLine.put("amount",                      round2(amt));
                taxLine.put("employer_contribution_rate",  empRate);
                taxLine.put("employer_contribution_amount", round2(amt * empRate / 100.0));
                taxDeductionLines.add(taxLine);
            } else if (!Boolean.TRUE.equals(d.getIsPretax()) && !Boolean.TRUE.equals(d.getIsTax())) {
                if ("net_pay".equals(d.getBasedOn())) {
                    // net_deductions computed after net pay is known — store deduction ref for later
                    Map<String, Object> placeholder = new LinkedHashMap<>();
                    placeholder.put("deduction_id",               d.getId());
                    placeholder.put("title",                      d.getTitle());
                    placeholder.put("is_pretax",                  false);
                    placeholder.put("amount",                     0.0);
                    placeholder.put("employer_contribution_rate", empRate);
                    placeholder.put("employer_contribution_amount", 0.0);
                    placeholder.put("_deduction",                 d);
                    netDeductionLines.add(placeholder);
                } else {
                    totalPostTax += amt;
                    postTaxDeductionLines.add(deductionLineWithContribution(d, amt, empRate));
                }
            }
        }

        // ── 7. Federal/filing-status tax ──────────────────────────────────────
        double taxableGrossPay = round2(grossPay - nonTaxableAllowanceTotal - totalPretax);
        Long contractFilingStatusId = (contract != null && contract.getFilingStatus() != null)
                ? contract.getFilingStatus().getId() : null;
        double federalTax = calculateTax(taxableGrossPay, companyId, contractFilingStatusId, startDate, endDate);

        // ── 8. Loan installments ──────────────────────────────────────────────
        List<LoanAccount> activeLoans = loanAccountRepository.findByEmployeeIdAndSettledFalse(employeeId);
        double totalLoanDeduction = 0.0;
        List<Map<String, Object>> loanLines = new ArrayList<>();
        Set<Deduction> installmentDeductions = new HashSet<>();
        for (LoanAccount loan : activeLoans) {
            if (loan.getInstallmentAmount() != null
                    && loan.getInstallmentStartDate() != null
                    && !loan.getInstallmentStartDate().isAfter(endDate)) {
                double la = loan.getInstallmentAmount().doubleValue();
                totalLoanDeduction += la;
                loanLines.add(Map.of("title", loan.getTitle(), "amount", la, "type", "LOAN"));
                // GCP: track which installment Deduction objects were applied (for installment_ratio)
                if (loan.getDeductionIds() != null) {
                    loan.getDeductionIds().stream()
                            .filter(d -> d.getOneTimeDate() != null
                                    && !d.getOneTimeDate().isBefore(startDate)
                                    && !d.getOneTimeDate().isAfter(endDate))
                            .forEach(installmentDeductions::add);
                }
            }
        }

        // ── 9. Approved reimbursements ────────────────────────────────────────
        List<Reimbursement> reimbursements = reimbursementRepository
                .findByEmployeeIdAndStatusAndAllowanceOnBetween(
                        employeeId, Reimbursement.ReimbursementStatus.APPROVED, startDate, endDate);
        double totalReimbursement = reimbursements.stream()
                .mapToDouble(r -> r.getAmount() != null ? r.getAmount().doubleValue() : 0.0).sum();
        for (Reimbursement r : reimbursements) {
            if (r.getAmount() != null) {
                allowanceLines.add(Map.of(
                        "allowance_id", 0L,
                        "title",        r.getTitle() != null ? r.getTitle() : "Reimbursement",
                        "is_taxable",   true,
                        "amount",       round2(r.getAmount().doubleValue())
                ));
            }
        }

        // ── 10. Preliminary net pay (before net_pay deductions) ───────────────
        double totalDeductionsBeforeNet = lossOfPay + totalPretax + totalTax + federalTax + totalPostTax + totalLoanDeduction;
        double prelimNetPay = round2(grossPay - totalDeductionsBeforeNet + totalReimbursement);

        // ── 11. Net-pay deductions (based_on="net_pay") ───────────────────────
        double totalNetDeductions = 0.0;
        List<Map<String, Object>> finalNetDeductionLines = new ArrayList<>();
        for (Map<String, Object> placeholder : netDeductionLines) {
            Deduction d = (Deduction) placeholder.get("_deduction");
            double amt = computeDeductionAmount(d, basicPay, grossPay, prelimNetPay, employee, startDate, endDate);
            double empRate = d.getEmployerRate() != null ? d.getEmployerRate() : 0.0;
            totalNetDeductions += amt;
            finalNetDeductionLines.add(deductionLineWithContribution(d, amt, empRate));
        }

        // Also check for updateCompensation="net_pay" deductions (specific employees only, mirrors GCP)
        for (Deduction d : compensationDeductions) {
            if ("net_pay".equals(d.getUpdateCompensation())) {
                double amt = computeDeductionAmount(d, basicPay, grossPay, prelimNetPay, employee, startDate, endDate);
                double empRate = d.getEmployerRate() != null ? d.getEmployerRate() : 0.0;
                totalNetDeductions += amt;
                finalNetDeductionLines.add(deductionLineWithContribution(d, amt, empRate));
            }
        }

        // ── 12. Final Net Pay ─────────────────────────────────────────────────
        double totalDeductions = round2(lossOfPay + totalPretax + totalTax + federalTax
                + totalPostTax + totalNetDeductions + totalLoanDeduction + lateDeduction);
        double netPay = round2(grossPay - totalDeductions + totalReimbursement);

        // ── 13. Build GCP-exact pay_head_data JSON ────────────────────────────
        Map<String, Object> payHeadData = new LinkedHashMap<>();
        payHeadData.put("employee",                employee.getId());
        payHeadData.put("wage_type",               wageType.name());
        payHeadData.put("worked_units",            round2(workedUnits));
        payHeadData.put("contract_wage",           round2(contractWage));
        payHeadData.put("basic_pay",               round2(basicPay));
        payHeadData.put("gross_pay",               round2(grossPay));
        payHeadData.put("housing_allowance",       round2(housingAllowance));
        payHeadData.put("transport_allowance",     round2(transportAllowance));
        payHeadData.put("other_allowance",         round2(otherAllowance));
        payHeadData.put("taxable_gross_pay",       round2(taxableGrossPay));
        payHeadData.put("net_pay",                 round2(netPay));
        payHeadData.put("allowances",              allowanceLines);
        payHeadData.put("paid_days",               round2(paidDays));
        payHeadData.put("unpaid_days",             round2(unpaidDays));
        payHeadData.put("loss_of_pay",             round2(lossOfPay));
        payHeadData.put("total_calendar_days",     periodDays);
        payHeadData.put("working_days",            workingDaysInPeriod);
        payHeadData.put("present_days",            presentDays);
        payHeadData.put("absent_days",             absentDays);
        payHeadData.put("paid_leave_days",         round2(paidLeaveDays));
        payHeadData.put("late_coming_days",        lateComing);
        payHeadData.put("early_leaving_days",      earlyLeaving);
        payHeadData.put("overtime_hours",          overtimeHours);
        payHeadData.put("leave_balance",           round2(totalLeaveBalance));
        payHeadData.put("late_deduction",          lateDeduction);
        payHeadData.put("basic_pay_deductions",    basicPayDeductionLines);
        payHeadData.put("gross_pay_deductions",    grossPayDeductionLines);
        payHeadData.put("pretax_deductions",       pretaxDeductionLines);
        payHeadData.put("tax_deductions",          taxDeductionLines);
        payHeadData.put("post_tax_deductions",     postTaxDeductionLines);
        payHeadData.put("net_deductions",          finalNetDeductionLines);
        payHeadData.put("loan_deductions",         loanLines);
        payHeadData.put("total_deductions",        round2(totalDeductions));
        payHeadData.put("federal_tax",             round2(federalTax));
        payHeadData.put("start_date",              startDate.toString());
        payHeadData.put("end_date",                endDate.toString());
        payHeadData.put("range",                   startDate.getMonth().name().substring(0, 3).toUpperCase()
                + " " + startDate.getDayOfMonth() + " " + startDate.getYear()
                + " - " + endDate.getMonth().name().substring(0, 3).toUpperCase()
                + " " + endDate.getDayOfMonth() + " " + endDate.getYear());

        // ── 14. Persist payslip ───────────────────────────────────────────────
        Payslip payslip = new Payslip();
        payslip.setEmployee(employee);
        payslip.setStartDate(startDate);
        payslip.setEndDate(endDate);
        payslip.setPayDate(endDate);
        payslip.setContractWage(BigDecimal.valueOf(contractWage));
        payslip.setBasicPay(BigDecimal.valueOf(basicPay));
        payslip.setGrossPay(BigDecimal.valueOf(grossPay));
        payslip.setHousingAllowance(BigDecimal.valueOf(housingAllowance));
        payslip.setTransportAllowance(BigDecimal.valueOf(transportAllowance));
        payslip.setOtherAllowance(BigDecimal.valueOf(otherAllowance));
        payslip.setDeduction(BigDecimal.valueOf(totalDeductions));
        payslip.setNetPay(BigDecimal.valueOf(netPay));
        payslip.setStatus(Payslip.PayslipStatus.DRAFT);
        payslip.setAutoGenerated(autoGenerated);
        payslip.setCompany(companyRepository.getReferenceById(companyId));
        try {
            payslip.setPayHeadData(objectMapper.writeValueAsString(payHeadData));
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize pay head data", e);
        }

        Payslip savedPayslip = payslipRepository.save(payslip);
        // GCP: link installment Deduction objects so installment_ratio() works correctly
        if (!installmentDeductions.isEmpty()) {
            savedPayslip.setInstallmentIds(installmentDeductions);
            savedPayslip = payslipRepository.save(savedPayslip);
        }
        eventPublisher.publishEvent(new PayslipGeneratedEvent(this, savedPayslip));
        return savedPayslip;
    }

    /**
     * Bulk-generate payslips for all active employees in a company.
     */
    @Transactional
    public List<Payslip> generateBulkPayslips(Long companyId, LocalDate startDate, LocalDate endDate) {
        return generateBulkPayslips(companyId, startDate, endDate, false, true, true);
    }

    /** Overload used by the scheduler — marks payslips as auto-generated at creation (no extra save needed). */
    @Transactional
    public List<Payslip> generateBulkPayslips(Long companyId, LocalDate startDate, LocalDate endDate, boolean autoGenerated) {
        return generateBulkPayslips(companyId, startDate, endDate, autoGenerated, true, true);
    }

    /** Overload with configurable weekend days — uses default late deduction rate (0.5). */
    @Transactional
    public List<Payslip> generateBulkPayslips(Long companyId, LocalDate startDate, LocalDate endDate, boolean autoGenerated, boolean weekendSat, boolean weekendSun) {
        return generateBulkPayslips(companyId, startDate, endDate, autoGenerated, weekendSat, weekendSun, 0.5);
    }

    /** Full overload with configurable weekend days and configurable late deduction rate. */
    @Transactional
    public List<Payslip> generateBulkPayslips(Long companyId, LocalDate startDate, LocalDate endDate, boolean autoGenerated, boolean weekendSat, boolean weekendSun, double lateDeductionRate) {
        List<Employee> employees = employeeRepository.findByCompanyIdAndIsActiveTrue(companyId);
        List<Payslip> results = new ArrayList<>();
        for (Employee emp : employees) {
            try {
                if (payslipRepository.existsByEmployeeIdAndStartDateAndEndDate(emp.getId(), startDate, endDate)) {
                    log.info("Payslip already exists for employee {} period {} to {}, skipping", emp.getId(), startDate, endDate);
                    continue;
                }
                results.add(generatePayslip(emp.getId(), startDate, endDate, companyId, autoGenerated, weekendSat, weekendSun, lateDeductionRate));
            } catch (Exception e) {
                log.warn("Failed to generate payslip for employee {}: {}", emp.getId(), e.getMessage());
            }
        }
        return results;
    }

    /**
     * Calculate income tax using progressive brackets with annualization.
     * Mirrors GCP calculate_taxable_amount:
     *   1. Annualize the period income → yearly_income = income / numDays * daysInYear
     *   2. Apply tax brackets to yearly income
     *   3. Convert back → federal_tax_for_period = (yearly_tax / daysInYear) * numDays
     */
    private double calculateTax(double taxableIncome, Long companyId, Long contractFilingStatusId,
                                LocalDate startDate, LocalDate endDate) {
        Long filingStatusId = contractFilingStatusId;
        if (filingStatusId == null) {
            List<FilingStatus> filingStatuses = filingStatusRepository.findByCompanyId(companyId);
            if (filingStatuses.isEmpty()) return 0.0;
            filingStatusId = filingStatuses.get(0).getId();
        }

        // SpEL-based custom tax expression (when usePy=true and pythonCode is set)
        FilingStatus filingStatus = filingStatusRepository.findById(filingStatusId).orElse(null);
        if (filingStatus != null && Boolean.TRUE.equals(filingStatus.getUsePy())
                && filingStatus.getPythonCode() != null && !filingStatus.getPythonCode().isBlank()) {
            try {
                SpelExpressionParser parser = new SpelExpressionParser();
                Expression expr = parser.parseExpression(filingStatus.getPythonCode());
                StandardEvaluationContext ctx = new StandardEvaluationContext();
                ctx.setVariable("grossIncome", taxableIncome);
                // Annualize for the expression so authors can write yearly-income-based logic
                long numDaysSpel = ChronoUnit.DAYS.between(startDate, endDate) + 1;
                int daysInYearSpel = Year.isLeap(startDate.getYear()) ? 366 : 365;
                ctx.setVariable("yearlyIncome", round2(taxableIncome / numDaysSpel * daysInYearSpel));
                ctx.setVariable("numDays", (double) numDaysSpel);
                ctx.setVariable("daysInYear", (double) daysInYearSpel);
                Object result = expr.getValue(ctx);
                if (result instanceof Number num) {
                    double exprValue = num.doubleValue();
                    // If value is between 0 and 1 treat as rate, otherwise treat as period tax amount
                    if (exprValue >= 0 && exprValue <= 1) {
                        return round2(taxableIncome * exprValue);
                    }
                    return round2(exprValue);
                }
            } catch (Exception ex) {
                log.warn("FilingStatus SpEL expression evaluation failed for id={}, falling back to brackets: {}",
                        filingStatusId, ex.getMessage());
            }
        }

        List<TaxBracket> brackets = taxBracketRepository.findByFilingStatusId(filingStatusId);
        if (brackets.isEmpty()) return 0.0;
        brackets.sort(Comparator.comparingDouble(TaxBracket::getMinIncome));

        // Annualize
        long numDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        int daysInYear = Year.isLeap(startDate.getYear()) ? 366 : 365;
        double yearlyIncome = round2(taxableIncome / numDays * daysInYear);

        // Apply brackets to yearly income
        double yearlyTax = 0.0;
        for (TaxBracket bracket : brackets) {
            double bracketMin = bracket.getMinIncome();
            double bracketMax = bracket.getMaxIncome() != null ? bracket.getMaxIncome() : Double.MAX_VALUE;
            if (yearlyIncome <= bracketMin) break;
            double taxableInBracket = Math.min(yearlyIncome, bracketMax) - bracketMin;
            yearlyTax += taxableInBracket * (bracket.getTaxRate() / 100.0);
        }

        // Convert back to period
        return round2((yearlyTax / daysInYear) * numDays);
    }

    /**
     * Send payslip email to the employee.
     */
    @Transactional
    public void sendPayslipEmail(Long payslipId) {
        Payslip payslip = payslipRepository.findByIdWithAssociations(payslipId)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip", payslipId));
        Employee employee = payslip.getEmployee();
        String recipientEmail = employee != null ? employee.getEmail() : null;
        if (recipientEmail == null || recipientEmail.isBlank()) {
            log.warn("No email address found for employee on payslip {}", payslipId);
            return;
        }
        Long companyId = payslip.getCompany() != null ? payslip.getCompany().getId() : null;
        String subject = "Your Payslip for " + payslip.getStartDate() + " to " + payslip.getEndDate();
        String body = "<p>Dear " + (employee.getFirstName() != null ? employee.getFirstName() : "Employee") + ",</p>"
                + "<p>Please find your payslip for the period "
                + payslip.getStartDate() + " to " + payslip.getEndDate() + ".</p>"
                + "<p>Net Pay: " + payslip.getNetPay() + "</p>"
                + "<p>Thank you.</p>";
        emailService.sendEmail(companyId, recipientEmail, subject, body, employee);
        log.info("Payslip email sent for payslip {} to {}", payslipId, recipientEmail);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private double round2(double val) {
        return Math.round(val * 100.0) / 100.0;
    }

    /** Count working days between start and end inclusive, excluding days in the weekendDays set */
    private int countWorkingDays(LocalDate start, LocalDate end, Set<DayOfWeek> weekendDays) {
        int count = 0;
        LocalDate d = start;
        while (!d.isAfter(end)) {
            if (!weekendDays.contains(d.getDayOfWeek())) count++;
            d = d.plusDays(1);
        }
        return count;
    }

    /** Backward-compatible overload — defaults to Saturday + Sunday as weekend days */
    private int countWorkingDays(LocalDate start, LocalDate end) {
        return countWorkingDays(start, end, Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY));
    }

    private Map<String, Object> deductionLine(Deduction d, double amount) {
        double empRate = d.getEmployerRate() != null ? d.getEmployerRate() : 0.0;
        return deductionLineWithContribution(d, amount, empRate);
    }

    /** GCP calculate_employer_contribution: includes computed employer_contribution_amount */
    private Map<String, Object> deductionLineWithContribution(Deduction d, double amount, double empRate) {
        Map<String, Object> line = new LinkedHashMap<>();
        line.put("deduction_id",                d.getId());
        line.put("title",                       d.getTitle());
        line.put("is_pretax",                   Boolean.TRUE.equals(d.getIsPretax()));
        line.put("amount",                      round2(amount));
        line.put("employer_contribution_rate",  empRate);
        line.put("employer_contribution_amount", round2(amount * empRate / 100.0));
        return line;
    }
}
