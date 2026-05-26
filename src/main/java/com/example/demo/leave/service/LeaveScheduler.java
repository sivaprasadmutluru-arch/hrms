package com.example.demo.leave.service;

import com.example.demo.leave.entity.AvailableLeave;
import com.example.demo.leave.entity.LeaveType;
import com.example.demo.leave.repository.AvailableLeaveRepository;
import com.example.demo.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.time.YearMonth;

/**
 * Mirrors Horilla's scheduler.py leave_reset() task.
 * Runs daily to handle automatic leave resets and carryforward expiry.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LeaveScheduler {

    private final AvailableLeaveRepository availableLeaveRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveAccrualService leaveAccrualService;

    /**
     * Runs daily at midnight.
     * On the last day of each month, triggers accrual posting for all accrual-enabled leave types.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void monthEndAccrual() {
        LocalDate today = LocalDate.now();
        if (today.equals(YearMonth.from(today).atEndOfMonth())) {
            leaveAccrualService.processMonthlyAccrual(today);
        }
    }

    @Scheduled(cron = "0 0 0 * * *") // midnight daily
    @Transactional
    public void leaveReset() {
        LocalDate today = LocalDate.now();

        List<LeaveType> resetTypes = leaveTypeRepository.findByResetTrue();
        for (LeaveType leaveType : resetTypes) {
            List<AvailableLeave> availableLeaves = availableLeaveRepository.findByLeaveTypeId(leaveType.getId());

            for (AvailableLeave al : availableLeaves) {
                // Reset: if reset_date == today, carry forward and set next reset date
                if (today.equals(al.getResetDate())) {
                    al.updateCarryforward();
                    al.setResetDate(al.computeNextResetDate(today));
                    // Fix 1: set expiry date on the balance when carry forward type is CARRYFORWARD_EXPIRE
                    if (leaveType.getCarryforwardType() == LeaveType.CarryforwardType.CARRYFORWARD_EXPIRE) {
                        al.setExpiredDate(computeNewExpiredDate(leaveType, today));
                    }
                    availableLeaveRepository.save(al);
                    log.info("Leave reset for employee={} leaveType={}", al.getEmployee().getId(), leaveType.getName());
                }

                // Carryforward expiry: if expired_date <= today, zero out carryforward only
                LocalDate expiredDate = al.getExpiredDate();
                if (expiredDate != null && !expiredDate.isAfter(today)) {
                    // Fix 2: only zero out carried-forward days; do not touch availableDays
                    al.setCarryforwardDays(0.0);
                    al.setExpiredDate(null);
                    availableLeaveRepository.save(al);
                    log.info("Carryforward expired for employee={} leaveType={}", al.getEmployee().getId(), leaveType.getName());
                }
            }

            // LeaveType-level fixed carryforward_expire_date
            LocalDate ltExpiry = leaveType.getCarryforwardExpireDate();
            if (ltExpiry != null && !ltExpiry.isAfter(today)) {
                if (leaveType.getCarryforwardExpireIn() != null && leaveType.getCarryforwardExpirePeriod() != null) {
                    leaveType.setCarryforwardExpireDate(computeNewExpiredDate(leaveType, today));
                    leaveTypeRepository.save(leaveType);
                }
            }
        }
    }

    private LocalDate computeNewExpiredDate(LeaveType leaveType, LocalDate from) {
        if (leaveType.getCarryforwardExpireIn() == null || leaveType.getCarryforwardExpirePeriod() == null) return null;
        int period = leaveType.getCarryforwardExpireIn();
        return switch (leaveType.getCarryforwardExpirePeriod()) {
            case "day"   -> from.plusDays(period);
            case "month" -> from.plusMonths(period);
            default      -> from.plusYears(period);
        };
    }
}
