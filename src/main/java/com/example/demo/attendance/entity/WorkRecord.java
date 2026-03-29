package com.example.demo.attendance.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_records")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class WorkRecord extends BaseEntity {

    public enum WorkRecordType {
        FDP,   // Full Day Present
        HDP,   // Half Day Present
        ABS,   // Absent
        LEA,   // Leave
        HD,    // Holiday/Company Leave
        MCO,   // Missed Check Out
        WOF,   // Weekly Off
        LFD,   // Full Day Leave
        LHD,   // Half Day Leave
        CONF,  // Conflict
        DFT    // Draft
    }

    @Column(name = "record_name", length = 250)
    private String recordName;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_record_type", length = 5)
    private WorkRecordType workRecordType;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "record_date")
    private LocalDate date;

    @Column(name = "at_work", length = 5)
    private String atWork = "00:00";

    @Column(name = "min_hour", length = 5)
    private String minHour = "00:00";

    @Column(name = "at_work_second")
    private Integer atWorkSecond = 0;

    @Column(name = "min_hour_second")
    private Integer minHourSecond = 0;

    @Column(name = "note", length = 255, columnDefinition = "TEXT")
    private String note;

    @Column(name = "message", length = 30)
    private String message;

    @Column(name = "is_attendance_record")
    private Boolean isAttendanceRecord = false;

    @Column(name = "is_leave_record")
    private Boolean isLeaveRecord = false;

    @Column(name = "day_percentage")
    private Double dayPercentage = 0.0;

    @Column(name = "last_update")
    private LocalDateTime lastUpdate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private com.example.demo.attendance.entity.Attendance attendance;
}
