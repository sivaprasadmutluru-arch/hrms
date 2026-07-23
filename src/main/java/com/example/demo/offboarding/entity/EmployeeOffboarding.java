package com.example.demo.offboarding.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_offboardings")
@Getter
@Setter
public class EmployeeOffboarding extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    /** Optional link to a checklist template task; the primary "start offboarding" flow never sets this. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private OffboardingTask task;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private OffboardingStatus status = OffboardingStatus.PENDING;

    /** Last Working Date / effective offboarding date (EMP-004). */
    @Column(name = "exit_date")
    private LocalDate exitDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "reason_of_leaving", columnDefinition = "TEXT")
    private String reasonOfLeaving;

    @Enumerated(EnumType.STRING)
    @Column(name = "notice_period_type")
    private NoticePeriodType noticePeriodType;

    /** Profile retention period (months) to keep the leaver visible in the Leavers tab (EMP-004). */
    @Column(name = "retention_period_months")
    private Integer retentionPeriodMonths;

    /** True if the employee leaves immediately rather than on a future exit date (EMP-004). */
    @Column(name = "immediate_leaving")
    private Boolean immediateLeaving = false;

    @Column(name = "initiated_by_user_id")
    private Long initiatedByUserId;

    @Column(name = "initiated_by_name")
    private String initiatedByName;

    /** Set once the linked Employee has actually been deactivated and moved to Leavers; null while still active/future-dated. */
    @Column(name = "employee_deactivated_at")
    private LocalDateTime employeeDeactivatedAt;

    /** exitDate + retentionPeriodMonths; computed when both are known (EMP-004). */
    @Column(name = "retention_expires_at")
    private LocalDate retentionExpiresAt;

    public enum OffboardingStatus {
        PENDING, IN_PROGRESS, COMPLETED
    }

    public enum NoticePeriodType {
        IMMEDIATE, TWO_WEEKS, ONE_MONTH, THREE_MONTHS
    }
}
