package com.example.demo.attendance.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.ShiftSchedule;
import com.example.demo.base.entity.WorkType;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "attendances")
@Getter
@Setter
public class Attendance extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "check_in")
    private LocalTime checkIn;

    @Column(name = "check_out")
    private LocalTime checkOut;

    @Column(name = "check_in_date")
    private LocalDate checkInDate;

    @Column(name = "check_out_date")
    private LocalDate checkOutDate;

    @Column(name = "worked_hour")
    private Double workedHour;

    @Column(name = "minimum_hour")
    private Double minimumHour;

    @Column(name = "attendance_overtime")
    private Double attendanceOvertime;

    @Column(name = "attendance_overtime_approve")
    private Boolean attendanceOvertimeApprove = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_validated")
    private AttendanceStatus attendanceValidated = AttendanceStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private ShiftSchedule shift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_type_id")
    private WorkType workType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "is_validate_request")
    private Boolean isValidateRequest = false;

    @Column(name = "is_validate_request_approved")
    private Boolean isValidateRequestApproved = false;

    public enum AttendanceStatus {
        PENDING, APPROVED, REJECTED
    }
}
