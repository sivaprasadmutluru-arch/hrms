package com.example.demo.onboarding.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "employee_onboardings")
@Getter
@Setter
public class EmployeeOnboarding extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private OnboardingTask task;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private OnboardingStatus status = OnboardingStatus.PENDING;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    public enum OnboardingStatus {
        PENDING, IN_PROGRESS, COMPLETED, SKIPPED
    }
}
