package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalTime;

@Entity
@Table(name = "employee_shift_schedules")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EmployeeShiftSchedule extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_day_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private EmployeeShiftDay day;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private EmployeeShift shift;

    @Column(name = "minimum_working_hour", length = 5)
    private String minimumWorkingHour = "08:15";

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "is_night_shift")
    private boolean nightShift = false;

    @Column(name = "is_auto_punch_out_enabled")
    private boolean autoPunchOutEnabled = false;

    @Column(name = "auto_punch_out_time")
    private LocalTime autoPunchOutTime;
}
