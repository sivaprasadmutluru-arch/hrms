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

    /**
     * Process monthly accruals for all accrual-enabled leave types.
     * Call this on the last day of each month.
     *
     * @param monthEnd the last day of the month being processed (e.g. 2025-03-31)
     */
    @Transactional
    public int processMonthlyAccrual(LocalDate monthEnd) {
        List<LeaveType> types = leaveTypeRepository.findByAccrualEnabledTrue();
        int totalPosted = 0;

        for (LeaveType lt : types) {
            double monthlyRate = roundToOneDecimal(lt.getTotalDays() != null ? lt.getTotalDays() / 12.0 : 0.0);
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
                    if (emp.getDateJoining() != null && emp.getDateJoining().isAfter(monthEnd)) continue;

                    AvailableLeave newBalance = new AvailableLeave();
                    newBalance.setEmployee(emp);
                    newBalance.setLeaveType(lt);
                    newBalance.setAvailableDays(0.0);
                    newBalance.setAssignedDate(monthEnd);
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
                if (accrualLogRepository.existsByEmployeeIdAndLeaveTypeIdAndAccrualDate(empId, ltId, monthEnd)) {
                    continue;
                }

                LocalDate joining = balance.getEmployee().getDateJoining();

                // Skip employees who haven't joined yet by end of this month
                if (joining != null && joining.isAfter(monthEnd)) {
                    continue;
                }

                double days;
                String note;

                boolean isJoiningMonth = joining != null
                        && joining.getYear() == monthEnd.getYear()
                        && joining.getMonthValue() == monthEnd.getMonthValue();

                if (isJoiningMonth) {
                    if (lt.getMidYearJoinerMode() == LeaveType.MidYearJoinerMode.AUTO_PRORATA) {
                        // Pro-rata: days from joining date to end of month (inclusive)
                        int daysWorked = monthEnd.getDayOfMonth() - joining.getDayOfMonth() + 1;
                        int totalDays = monthEnd.lengthOfMonth();
                        days = roundToOneDecimal((double) daysWorked / totalDays * monthlyRate);
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
                entry.setAccrualDate(monthEnd);
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

    private double roundToOneDecimal(double val) {
        return Math.round(val * 10.0) / 10.0;
    }
}
