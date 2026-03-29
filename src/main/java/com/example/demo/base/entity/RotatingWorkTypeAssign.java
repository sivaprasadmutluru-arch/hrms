package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "rotating_work_type_assigns")
@Getter
@Setter
public class RotatingWorkTypeAssign extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "work_type_id", nullable = false)
    private WorkType workType;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "next_change_date")
    private LocalDate nextChangeDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "rotate_after_every")
    private RotateAfterEvery rotateAfterEvery;

    @Column(name = "rotate_after_every_count")
    private Integer rotateAfterEveryCount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rotating_work_type_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private RotatingWorkType rotatingWorkType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_work_type_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WorkType currentWorkType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "next_work_type_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WorkType nextWorkType;

    @Column(name = "rotate_after_day")
    private Integer rotateAfterDay = 7;

    @Column(name = "rotate_every_weekend", length = 10)
    private String rotateEveryWeekend = "monday";

    @Column(name = "rotate_every", length = 10)
    private String rotateEvery;

    @Column(name = "based_on", length = 10)
    private String basedOn;

    public enum RotateAfterEvery {
        DAYS, WEEKS, MONTHS
    }
}
