package com.example.demo.offboarding.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "employee_offboardings")
@Getter
@Setter
public class EmployeeOffboarding extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private OffboardingTask task;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private OffboardingStatus status = OffboardingStatus.PENDING;

    @Column(name = "exit_date")
    private LocalDate exitDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "reason_of_leaving", columnDefinition = "TEXT")
    private String reasonOfLeaving;

    @Enumerated(EnumType.STRING)
    @Column(name = "notice_period_type")
    private NoticePeriodType noticePeriodType;

    public enum OffboardingStatus {
        PENDING, IN_PROGRESS, COMPLETED
    }

    public enum NoticePeriodType {
        IMMEDIATE, TWO_WEEKS, ONE_MONTH, THREE_MONTHS
    }
}
