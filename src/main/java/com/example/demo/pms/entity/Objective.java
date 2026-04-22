package com.example.demo.pms.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "objectives")
@Getter
@Setter
public class Objective extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ObjectiveStatus status = ObjectiveStatus.NOT_STARTED;

    @Column(name = "progress")
    private Integer progress = 0;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_id")
    private PerformanceCycle cycle;

    public enum ObjectiveStatus {
        NOT_STARTED, IN_PROGRESS, AT_RISK, COMPLETED, ARCHIVED
    }
}
