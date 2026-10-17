package com.example.demo.leave.service;

import com.example.demo.employee.entity.Employee;
import com.example.demo.leave.entity.AvailableLeave;
import com.example.demo.leave.entity.LeaveType;
import com.example.demo.leave.repository.AvailableLeaveRepository;
import com.example.demo.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;

/** Grants a one-time prorated annual entitlement to eligible new joiners. */
@Slf4j
@Service
@RequiredArgsConstructor
public class NewJoinerLeaveEntitlementService {
    private final LeaveTypeRepository leaveTypeRepository;
    private final AvailableLeaveRepository availableLeaveRepository;

    public void grantFor(Employee employee) {
        if (employee.getCompany() == null || employee.getDateJoining() == null || !employee.isActive()) return;
        LocalDate today = LocalDate.now();
        for (LeaveType type : leaveTypeRepository.findByCompanyIdAndIsActiveTrue(employee.getCompany().getId())) {
            // Recurring accrual types are handled by LeaveAccrualService. This path is for
            // annual entitlements such as Sick Leave, which are granted once on joining.
            if (Boolean.TRUE.equals(type.getAccrualEnabled())
                    || type.getMidYearJoinerMode() != LeaveType.MidYearJoinerMode.AUTO_PRORATA
                    || type.getTotalDays() == null || type.getTotalDays() <= 0) continue;
            if (availableLeaveRepository.findByEmployeeIdAndLeaveTypeId(employee.getId(), type.getId()).isPresent()) continue;

            LeavePeriodResolver.Period period = LeavePeriodResolver.containing(type, today);
            LocalDate joining = employee.getDateJoining();
            if (joining.isBefore(period.start()) || joining.isAfter(today)) continue;

            LeaveType.AccrualProrationBasis basis = type.getAccrualProrationBasis() != null
                    ? type.getAccrualProrationBasis() : LeaveType.AccrualProrationBasis.CALENDAR_DAYS;
            long fullDays = eligibleDays(period.start(), period.end(), basis);
            long remainingDays = eligibleDays(joining, period.end(), basis);
            if (fullDays <= 0 || remainingDays <= 0) continue;

            int precision = type.getAccrualPrecision() != null && type.getAccrualPrecision() == 2 ? 2 : 1;
            double entitlement = round((double) type.getTotalDays() * remainingDays / fullDays, precision);
            AvailableLeave balance = new AvailableLeave();
            balance.setEmployee(employee);
            balance.setLeaveType(type);
            balance.setAvailableDays(entitlement);
            balance.setCarryforwardDays(0d);
            balance.setTotalLeaveDays(entitlement);
            balance.setAssignedDate(joining);
            availableLeaveRepository.save(balance);
            log.info("Granted prorated new-joiner leave: employee={} type={} days={}",
                    employee.getId(), type.getName(), entitlement);
        }
    }

    private long eligibleDays(LocalDate from, LocalDate to, LeaveType.AccrualProrationBasis basis) {
        if (basis != LeaveType.AccrualProrationBasis.WORKING_DAYS) return from.datesUntil(to.plusDays(1)).count();
        return from.datesUntil(to.plusDays(1))
                .filter(day -> day.getDayOfWeek() != DayOfWeek.SATURDAY && day.getDayOfWeek() != DayOfWeek.SUNDAY)
                .count();
    }

    private double round(double value, int precision) {
        return BigDecimal.valueOf(value).setScale(precision, RoundingMode.HALF_UP).doubleValue();
    }
}
