package com.example.demo.attendance.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.EmployeeShiftDay;
import com.example.demo.base.entity.ShiftSchedule;
import com.example.demo.base.entity.WorkType;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "attendances", indexes = {
        @Index(name = "idx_attendance_emp_date", columnList = "employee_id, attendance_date"),
        @Index(name = "idx_attendance_company_date", columnList = "company_id, attendance_date"),
        @Index(name = "idx_attendance_validated_date", columnList = "attendance_validated, attendance_date")
})
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

    @Column(name = "at_work_second")
    private Integer atWorkSecond;

    @Column(name = "overtime_second")
    private Integer overtimeSecond;

    @Column(name = "approved_overtime_second")
    private Integer approvedOvertimeSecond;

    @Column(name = "is_bulk_request")
    private boolean isBulkRequest = false;

    @Column(name = "request_description", columnDefinition = "TEXT")
    private String requestDescription;

    @Column(name = "request_type", length = 20)
    private String requestType;

    @Column(name = "is_holiday")
    private boolean isHoliday = false;

    @Column(name = "requested_data", columnDefinition = "TEXT")
    private String requestedData;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_day_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private EmployeeShiftDay shiftDay;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_attendance_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private BatchAttendance batchAttendance;

    public enum AttendanceStatus {
        PENDING, APPROVED, REJECTED
    }
}
