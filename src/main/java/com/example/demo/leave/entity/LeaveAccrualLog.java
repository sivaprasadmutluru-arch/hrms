package com.example.demo.leave.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Audit trail of every monthly accrual credit posted to an employee's leave balance.
 * Unique constraint on (employee, leaveType, accrualDate) ensures idempotency —
 * re-running the scheduler for the same month-end never double-credits.
 */
@Entity
@Table(name = "leave_accrual_logs", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"employee_id", "leave_type_id", "accrual_date"})
})
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class LeaveAccrualLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    /** Last day of the month this accrual covers (e.g. 2025-01-31) */
    @Column(name = "accrual_date", nullable = false)
    private LocalDate accrualDate;

    /** Number of days credited */
    @Column(nullable = false)
    private Double days;

    /** MONTHLY | PRORATA_JOINING */
    @Column(length = 30)
    private String note;
}
