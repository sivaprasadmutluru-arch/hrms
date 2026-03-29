package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "rotating_shift_assigns")
@Getter
@Setter
public class RotatingShiftAssign extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_id", nullable = false)
    private ShiftSchedule shift;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "next_change_date")
    private LocalDate nextChangeDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "rotate_after_every")
    private RotateAfterEvery rotateAfterEvery;

    @Column(name = "rotate_after_every_count")
    private Integer rotateAfterEveryCount;

    @Column(name = "based_on")
    private String basedOn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rotating_shift_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private RotatingShift rotatingShift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_shift_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private EmployeeShift currentShift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "next_shift_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private EmployeeShift nextShift;

    @Column(name = "rotate_after_day")
    private Integer rotateAfterDay = 7;

    @Column(name = "rotate_every_weekend", length = 10)
    private String rotateEveryWeekend = "monday";

    @Column(name = "rotate_every", length = 10)
    private String rotateEvery;

    public enum RotateAfterEvery {
        DAYS, WEEKS, MONTHS
    }
}
