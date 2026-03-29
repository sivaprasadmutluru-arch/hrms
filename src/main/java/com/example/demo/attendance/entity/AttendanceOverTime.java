package com.example.demo.attendance.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "attendance_over_times")
@Getter
@Setter
public class AttendanceOverTime extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "month")
    private String month;

    @Column(name = "year")
    private Integer year;

    @Column(name = "overtime_hours")
    private Double overtimeHours;

    @Column(name = "hour", length = 10)
    private String hour;

    @Column(name = "hour_account_second")
    private Integer hourAccountSecond;

    @Column(name = "overtime", length = 10)
    private String overtime;

    @Column(name = "overtime_second")
    private Integer overtimeSecond;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private OvertimeStatus status = OvertimeStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    public enum OvertimeStatus {
        PENDING, APPROVED, REJECTED
    }
}
