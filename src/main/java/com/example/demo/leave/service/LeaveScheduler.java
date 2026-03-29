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
                    availableLeaveRepository.save(al);
                    log.info("Leave reset for employee={} leaveType={}", al.getEmployee().getId(), leaveType.getName());
                }

                // Carryforward expiry: if expired_date <= today, zero out carryforward and set new expiry
                LocalDate expiredDate = al.getExpiredDate();
                if (expiredDate != null && !expiredDate.isAfter(today)) {
                    al.setCarryforwardDays(0.0);
                    al.setAvailableDays(leaveType.getTotalDays() != null ? leaveType.getTotalDays().doubleValue() : 0.0);
                    // Compute new expiry date from today
                    al.setExpiredDate(computeNewExpiredDate(leaveType, today));
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
