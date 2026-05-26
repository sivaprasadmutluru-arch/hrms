package com.example.demo.leave.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalDate;

@Entity
@Table(name = "available_leaves", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"employee_id", "leave_type_id"})
})
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AvailableLeave extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @Column(name = "available_days")
    private Double availableDays = 0.0;

    @Column(name = "carryforward_days")
    private Double carryforwardDays = 0.0;

    /** Computed: availableDays + carryforwardDays (matches Horilla pre_save_processing) */
    @Column(name = "total_leave_days")
    private Double totalLeaveDays = 0.0;

    @Column(name = "assigned_date")
    private LocalDate assignedDate;

    @Column(name = "reset_date")
    private LocalDate resetDate;

    @Column(name = "expired_date")
    private LocalDate expiredDate;

    @PrePersist
    @PreUpdate
    public void computeTotalLeaveDays() {
        double avail = availableDays != null ? availableDays : 0.0;
        double carry = carryforwardDays != null ? carryforwardDays : 0.0;
        this.carryforwardDays = Math.max(carry, 0.0);
        this.totalLeaveDays = Math.max(avail + this.carryforwardDays, 0.0);
    }

    /**
     * Called on reset_date: carries forward remaining days (capped by carryforward_max)
     * then resets available_days to the leave type's total_days.
     * Mirrors Horilla AvailableLeave.update_carryforward().
     */
    public void updateCarryforward() {
        if (leaveType == null) return;
        String cfType = leaveType.getCarryforwardType() != null
                ? leaveType.getCarryforwardType().name() : "NO_CARRYFORWARD";
        if (!"NO_CARRYFORWARD".equals(cfType)) {
            double max = leaveType.getCarryforwardMax() != null
                    ? leaveType.getCarryforwardMax() : Double.MAX_VALUE;
            // FIX #6: carry forward only the remaining available days, NOT totalLeaveDays
            // (totalLeaveDays = availableDays + carryforwardDays, which would double-count)
            this.carryforwardDays = Math.min(availableDays != null ? availableDays : 0.0, max);
        } else {
            this.carryforwardDays = 0.0;
        }
        // If accrual is enabled, zero out available days on reset — monthly accrual will refill it.
        // If accrual is disabled, restore the full annual entitlement immediately.
        if (Boolean.TRUE.equals(leaveType.getAccrualEnabled())) {
            this.availableDays = 0.0;
        } else {
            this.availableDays = leaveType.getTotalDays() != null
                    ? leaveType.getTotalDays().doubleValue() : 0.0;
        }
    }

    /**
     * Computes the next reset date based on LeaveType reset config.
     * Mirrors Horilla AvailableLeave.set_reset_date().
     */
    public LocalDate computeNextResetDate(LocalDate fromDate) {
        if (leaveType == null || !Boolean.TRUE.equals(leaveType.getReset())) return null;
        String based = leaveType.getResetBased();
        String day = leaveType.getResetDay();
        if (based == null || day == null) return null;

        switch (based) {
            case "monthly": {
                int resetDay = "last day".equals(day)
                        ? fromDate.lengthOfMonth() : Integer.parseInt(day);
                LocalDate candidate = fromDate.withDayOfMonth(Math.min(resetDay, fromDate.lengthOfMonth()));
                if (!fromDate.isBefore(candidate)) {
                    LocalDate next = fromDate.plusMonths(1);
                    candidate = next.withDayOfMonth(Math.min(resetDay, next.lengthOfMonth()));
                }
                return candidate;
            }
            case "weekly": {
                // resetWeekend: "0"=Monday .. "6"=Sunday
                int target = leaveType.getResetWeekend() != null
                        ? Integer.parseInt(leaveType.getResetWeekend()) : 0;
                DayOfWeek targetDow = DayOfWeek.of(target == 6 ? 7 : target + 1);
                LocalDate d = fromDate.plusDays(1);
                while (d.getDayOfWeek() != targetDow) d = d.plusDays(1);
                return d;
            }
            case "yearly": {
                int month = leaveType.getResetMonth() != null
                        ? Integer.parseInt(leaveType.getResetMonth()) : 1;
                int resetDay = "last day".equals(day)
                        ? LocalDate.of(fromDate.getYear(), month, 1).lengthOfMonth()
                        : Integer.parseInt(day);
                LocalDate candidate = LocalDate.of(fromDate.getYear(), month, resetDay);
                if (!fromDate.isBefore(candidate)) {
                    candidate = LocalDate.of(fromDate.getYear() + 1, month, resetDay);
                }
                return candidate;
            }
            default:
                return null;
        }
    }

    /**
     * If the leave type resets and the next reset date is on or before the given date,
     * returns the type's total_days (forecasted). Mirrors Horilla forcasted_leaves().
     */
    public double forcastedLeaves(LocalDate date) {
        if (leaveType == null || !Boolean.TRUE.equals(leaveType.getReset())) return 0.0;
        LocalDate nextReset = computeNextResetDate(LocalDate.now());
        if (nextReset != null && !nextReset.isAfter(date)) {
            return leaveType.getTotalDays() != null ? leaveType.getTotalDays().doubleValue() : 0.0;
        }
        return 0.0;
    }
}
