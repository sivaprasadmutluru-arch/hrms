package com.example.demo.leave.service;

import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.entity.AvailableLeave;
import com.example.demo.leave.entity.LeaveAccrualLog;
import com.example.demo.leave.entity.LeaveType;
import com.example.demo.leave.repository.AvailableLeaveRepository;
import com.example.demo.leave.repository.LeaveAccrualLogRepository;
import com.example.demo.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.YearMonth;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Handles monthly accrual logic for accrual-enabled leave types.
 *
 * Rules:
 * - Monthly accrual rate = totalDays / 12, rounded to 1 decimal
 * - Accrual is posted on the last day of each month
 * - Idempotent: unique constraint on (employee, leaveType, accrualDate) prevents double-posting
 * - MANUAL mode: joining month is skipped; HR sets opening balance manually
 * - AUTO_PRORATA mode: joining month gets (days_worked / total_days_in_month) * monthly_rate
 * - Employees who joined AFTER this month-end are skipped entirely
 * - AvailableLeave rows are auto-created for eligible employees who don't have one yet
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LeaveAccrualService {

    private final LeaveTypeRepository leaveTypeRepository;
    private final AvailableLeaveRepository availableLeaveRepository;
    private final LeaveAccrualLogRepository accrualLogRepository;
    private final EmployeeRepository employeeRepository;

    /** Backwards-compatible manual run: processes legacy end-of-month policies. */
    @Transactional
    public int processMonthlyAccrual(LocalDate accrualPeriod) {
        return processMonthlyAccrual(accrualPeriod, LeaveType.AccrualPostingTiming.END_OF_MONTH);
    }

    /**
     * Process monthly accruals for all accrual-enabled leave types.
     * Call this on the last day of each month.
     *
     * @param monthEnd the last day of the month being processed (e.g. 2025-03-31)
     */
    @Transactional
    public int processMonthlyAccrual(LocalDate accrualPeriod, LeaveType.AccrualPostingTiming timing) {
        List<LeaveType> types = leaveTypeRepository.findByAccrualEnabledTrue();
        int totalPosted = 0;

        for (LeaveType lt : types) {
            LeaveType.AccrualPostingTiming postingTiming = lt.getAccrualPostingTiming() != null
                    ? lt.getAccrualPostingTiming() : LeaveType.AccrualPostingTiming.END_OF_MONTH;
            if (postingTiming != timing) continue;
            int precision = lt.getAccrualPrecision() != null && lt.getAccrualPrecision() == 2 ? 2 : 1;
            double monthlyRate = monthlyCredit(lt, accrualPeriod, precision);
            if (monthlyRate <= 0) continue;

            List<AvailableLeave> balances = availableLeaveRepository.findByLeaveTypeId(lt.getId());

            // Auto-create missing AvailableLeave rows for active employees in this leave type's company
            // who have already joined but were never explicitly allocated this leave type.
            if (lt.getCompany() != null) {
                Set<Long> alreadyHaveBalance = balances.stream()
                        .map(b -> b.getEmployee().getId())
                        .collect(Collectors.toSet());

                List<Employee> companyEmployees = employeeRepository.findByCompanyIdAndIsActiveTrue(lt.getCompany().getId());
                for (Employee emp : companyEmployees) {
                    if (alreadyHaveBalance.contains(emp.getId())) continue;
                    // Skip employees who haven't joined yet
                    if (emp.getDateJoining() != null && emp.getDateJoining().isAfter(accrualPeriod.withDayOfMonth(accrualPeriod.lengthOfMonth()))) continue;

                    AvailableLeave newBalance = new AvailableLeave();
                    newBalance.setEmployee(emp);
                    newBalance.setLeaveType(lt);
                    newBalance.setAvailableDays(0.0);
                    newBalance.setAssignedDate(accrualPeriod);
                    newBalance = availableLeaveRepository.save(newBalance);
                    balances.add(newBalance);
                    log.info("Auto-created AvailableLeave for employee={} leaveType={} (was missing before accrual)",
                            emp.getId(), lt.getName());
                }
            }

            for (AvailableLeave balance : balances) {
                Long empId = balance.getEmployee().getId();
                Long ltId = lt.getId();

                // Idempotency check
                if (accrualLogRepository.existsByEmployeeIdAndLeaveTypeIdAndAccrualDate(empId, ltId, accrualPeriod)) {
                    continue;
                }

                LocalDate joining = balance.getEmployee().getDateJoining();

                // Skip employees who haven't joined yet by end of this month
                if (joining != null && joining.isAfter(accrualPeriod.withDayOfMonth(accrualPeriod.lengthOfMonth()))) {
                    continue;
                }

                double days;
                String note;

                boolean isJoiningMonth = joining != null
                        && joining.getYear() == accrualPeriod.getYear()
                        && joining.getMonthValue() == accrualPeriod.getMonthValue();

                if (isJoiningMonth) {
                    if (lt.getMidYearJoinerMode() == LeaveType.MidYearJoinerMode.AUTO_PRORATA) {
                        // Pro-rata: days from joining date to end of month (inclusive)
                        LeaveType.AccrualProrationBasis basis = lt.getAccrualProrationBasis() != null
                                ? lt.getAccrualProrationBasis() : LeaveType.AccrualProrationBasis.CALENDAR_DAYS;
                        days = proratedCredit(joining, accrualPeriod, monthlyRate, precision, basis);
                        note = "PRORATA_JOINING";
                    } else {
                        // MANUAL: skip joining month, HR sets opening balance
                        continue;
                    }
                } else {
                    days = monthlyRate;
                    note = "MONTHLY";
                }

                if (days <= 0) continue;

                // Credit the balance
                double current = balance.getAvailableDays() != null ? balance.getAvailableDays() : 0.0;
                balance.setAvailableDays(current + days);
                availableLeaveRepository.save(balance);

                // Log it
                LeaveAccrualLog entry = new LeaveAccrualLog();
                entry.setEmployee(balance.getEmployee());
                entry.setLeaveType(lt);
                entry.setAccrualDate(accrualPeriod);
                entry.setDays(days);
                entry.setNote(note);
                accrualLogRepository.save(entry);

                totalPosted++;
                log.info("Accrual posted: employee={} leaveType={} date={} days={} note={}",
                        empId, lt.getName(), monthEnd, days, note);
            }
        }

        log.info("Monthly accrual complete for {}: {} credits posted", monthEnd, totalPosted);
        return totalPosted;
    }

    private double monthlyCredit(LeaveType type, LocalDate period, int precision) {
        if (type.getTotalDays() == null || type.getTotalDays() <= 0) return 0;
        if (type.getAccrualCalculationMethod() != LeaveType.AccrualCalculationMethod.ANNUAL_CAP_RECONCILED) {
            return round((double) type.getTotalDays() / 12, precision);
        }
        LeavePeriodResolver.Period leaveYear = LeavePeriodResolver.containing(type, period);
        int month = (period.getYear() - leaveYear.start().getYear()) * 12
                + period.getMonthValue() - leaveYear.start().getMonthValue() + 1;
        month = Math.max(1, Math.min(12, month));
        double current = round((double) type.getTotalDays() * month / 12, precision);
        double previous = round((double) type.getTotalDays() * (month - 1) / 12, precision);
        return current - previous;
    }

    private double proratedCredit(LocalDate joining, LocalDate period, double monthlyCredit, int precision,
                                  LeaveType.AccrualProrationBasis basis) {
        LocalDate end = period.withDayOfMonth(period.lengthOfMonth());
        long total;
        long eligible;
        if (basis == LeaveType.AccrualProrationBasis.WORKING_DAYS) {
            total = weekdays(period.withDayOfMonth(1), end);
            eligible = weekdays(joining, end);
        } else {
            total = period.lengthOfMonth();
            eligible = end.getDayOfMonth() - joining.getDayOfMonth() + 1;
        }
        return total == 0 ? 0 : round(monthlyCredit * eligible / total, precision);
    }

    private long weekdays(LocalDate start, LocalDate end) {
        long count = 0;
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            if (date.getDayOfWeek() != DayOfWeek.SATURDAY && date.getDayOfWeek() != DayOfWeek.SUNDAY) count++;
        }
        return count;
    }

    private double round(double value, int precision) {
        return BigDecimal.valueOf(value).setScale(precision, RoundingMode.HALF_UP).doubleValue();
    }
}
