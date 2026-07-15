package com.example.demo.attendance.entity;

import com.example.demo.base.entity.EmployeeShiftDay;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_day_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private EmployeeShiftDay shiftDay;

    @Column(name = "clock_in")
    private LocalTime clockIn;

    @Column(name = "clock_in_date")
    private LocalDate clockInDate;

    @Column(name = "clock_out")
    private LocalTime clockOut;

    @Column(name = "clock_out_date")
    private LocalDate clockOutDate;

    @Column(name = "in_datetime", columnDefinition = "timestamptz")
    private LocalDateTime inDatetime;

    @Column(name = "out_datetime", columnDefinition = "timestamptz")
    private LocalDateTime outDatetime;

    @Enumerated(EnumType.STRING)
    @Column(name = "clock_type")
    private ClockType clockType = ClockType.MANUAL;

    public enum ClockType {
        MANUAL, AUTO
    }

    // ─── Geolocation (captured from client at punch time) ────────────────────

    @Column(name = "clock_in_latitude")
    private Double clockInLatitude;

    @Column(name = "clock_in_longitude")
    private Double clockInLongitude;

    @Column(name = "clock_in_within_geofence")
    private Boolean clockInWithinGeofence;

    @Column(name = "clock_in_distance_meters")
    private Double clockInDistanceMeters;

    @Column(name = "clock_out_latitude")
    private Double clockOutLatitude;

    @Column(name = "clock_out_longitude")
    private Double clockOutLongitude;

    @Column(name = "clock_out_within_geofence")
    private Boolean clockOutWithinGeofence;

    @Column(name = "clock_out_distance_meters")
    private Double clockOutDistanceMeters;

    @Column(name = "clock_in_accuracy_meters")
    private Double clockInAccuracyMeters;

    @Column(name = "clock_out_accuracy_meters")
    private Double clockOutAccuracyMeters;

    @Column(name = "clock_in_address", length = 500)
    private String clockInAddress;

    @Column(name = "clock_out_address", length = 500)
    private String clockOutAddress;
}
