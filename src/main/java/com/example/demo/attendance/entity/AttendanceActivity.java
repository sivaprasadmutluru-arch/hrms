package com.example.demo.attendance.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "attendance_activities")
@Getter
@Setter
public class AttendanceActivity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "attendance_date")
    private LocalDate attendanceDate;

    @Column(name = "clock_in")
    private LocalTime clockIn;

    @Column(name = "clock_in_date")
    private LocalDate clockInDate;

    @Column(name = "clock_out")
    private LocalTime clockOut;

    @Column(name = "clock_out_date")
    private LocalDate clockOutDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "in_datetime")
    private ClockType clockType = ClockType.MANUAL;

    public enum ClockType {
        MANUAL, AUTO
    }
}
