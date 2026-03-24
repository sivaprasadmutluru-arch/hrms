package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
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

    public enum RotateAfterEvery {
        DAYS, WEEKS, MONTHS
    }
}
