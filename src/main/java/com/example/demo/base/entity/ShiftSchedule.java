package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalTime;

@Entity
@Table(name = "shift_schedules")
@Getter
@Setter
public class ShiftSchedule extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "minimum_working_hour")
    private Integer minimumWorkingHour;

    @Column(name = "full_time")
    private Boolean fullTime = true;

    /** Maximum overtime credited for this shift (HH:MM). Overrides company-level overtimeCutoff. */
    @Column(name = "overtime_cutoff")
    private String overtimeCutoff;

    /** Minimum overtime before it is eligible for approval (HH:MM). Overrides company-level value. */
    @Column(name = "minimum_overtime_to_approve")
    private String minimumOvertimeToApprove;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;
}
