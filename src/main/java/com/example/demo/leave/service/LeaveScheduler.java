package com.example.demo.leave.service;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.tenant.TenantContext;
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
    private final CompanyRepository companyRepository;

    /**
     * Runs daily at midnight and posts the previous month's accrual in every tenant.
     * Running daily provides automatic catch-up when the application was unavailable on
     * the first day of the month. LeaveAccrualService is idempotent, so later daily runs
     * cannot credit an employee twice for the same month.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void monthEndAccrual() {
        runMonthlyAccrualCatchUp(LocalDate.now());
    }

    void runMonthlyAccrualCatchUp(LocalDate today) {
        LocalDate monthEnd = YearMonth.from(today).minusMonths(1).atEndOfMonth();
        List<Company> tenants = companyRepository.findAllHeadOfficesActivePublic();
        log.info("[LeaveScheduler] Processing accrual date={} across {} tenants", monthEnd, tenants.size());

        for (Company tenant : tenants) {
            String schema = tenant.getSchemaName();
            if (schema == null || schema.isBlank()) {
                log.warn("[LeaveScheduler] Skipping company id={} because it has no tenant schema", tenant.getId());
                continue;
            }

            try {
                TenantContext.setTenant(schema);
                int posted = leaveAccrualService.processMonthlyAccrual(monthEnd);
                log.info("[LeaveScheduler] Tenant={} accrualDate={} posted={}", schema, monthEnd, posted);
            } catch (Exception ex) {
                // One tenant must not prevent accrual processing for every other company.
                log.error("[LeaveScheduler] Accrual failed for tenant={} accrualDate={}", schema, monthEnd, ex);
            } finally {
                TenantContext.clear();
            }
        }
    }

    @Scheduled(cron = "0 1 0 * * *") // 00:01 daily — runs AFTER monthEndAccrual to avoid reset wiping accrual credit
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
