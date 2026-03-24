package com.example.demo.offboarding.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "offboarding_employee_tasks")
@Getter
@Setter
public class OffboardingEmployeeTask extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_offboarding_id", nullable = false)
    private EmployeeOffboarding employeeOffboarding;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offboarding_task_id")
    private OffboardingTask offboardingTask;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "is_completed")
    private Boolean isCompleted = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id")
    private Employee assignedTo;
}
