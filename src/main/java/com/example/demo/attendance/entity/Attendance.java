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

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "attendances", indexes = {
        @Index(name = "idx_attendance_emp_date",    columnList = "employee_id, attendance_date"),
        @Index(name = "idx_attendance_company_date", columnList = "company_id, attendance_date"),
        @Index(name = "idx_attendance_status_date", columnList = "attendance_status, attendance_date")
})
@Getter
@Setter
public class Attendance extends BaseEntity {

    // ─── Enums ────────────────────────────────────────────────────────────────

    /** Quality of the attendance record — set automatically on checkout. */
    public enum AttendanceQualityStatus {
        REGULAR,      // on time, sufficient hours — no deduction
        IRREGULAR,    // late / early-out / short hours — deduction applies
        REGULARISED   // was IRREGULAR, regularisation request fully approved
    }

    /** Quick flag for UI filtering — does this record have an active regularisation request? */
    public enum RegularisationStatus {
        NONE,         // no request
        HAS_PENDING,  // request submitted, pending approval
        REGULARISED   // request fully approved
    }

    // ─── Core Fields ──────────────────────────────────────────────────────────

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

    @Column(name = "check_in_utc")
    private Instant checkInUtc;

    @Column(name = "check_out_utc")
    private Instant checkOutUtc;

    @Column(name = "worked_hour")
    private Double workedHour;

    @Column(name = "minimum_hour")
    private Double minimumHour;

    @Column(name = "attendance_overtime")
    private Double attendanceOvertime;

    @Column(name = "at_work_second")
    private Integer atWorkSecond;

    @Column(name = "overtime_second")
    private Integer overtimeSecond;

    /** Overtime in whole minutes — derived from overtimeSecond, stored for convenience. */
    @Column(name = "overtime_minutes")
    private Integer overtimeMinutes = 0;

    // ─── Auto-Evaluated Status ────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_status", length = 20)
    private AttendanceQualityStatus attendanceStatus = AttendanceQualityStatus.REGULAR;

    /** Total violation minutes (late + early-out + shortage). Zero for REGULAR / REGULARISED. */
    @Column(name = "deduction_minutes")
    private Integer deductionMinutes = 0;

    /** Salary deduction amount — computed during payroll, stored here for preview. */
    @Column(name = "deduction_amount")
    private Double deductionAmount = 0.0;

    // ─── Regularisation Quick-Flag ────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "regularisation_status", length = 20)
    private RegularisationStatus regularisationStatus = RegularisationStatus.NONE;

    // ─── Relations ────────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private ShiftSchedule shift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_type_id")
    private WorkType workType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_day_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private EmployeeShiftDay shiftDay;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_attendance_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private BatchAttendance batchAttendance;

    // ─── Misc ─────────────────────────────────────────────────────────────────

    @Column(name = "is_holiday")
    private Boolean isHoliday = false;

    @Column(name = "requested_data", columnDefinition = "TEXT")
    private String requestedData;

    // ─── Device / Source Tracking (ADMS Push) ────────────────────────────────

    @Column(name = "clock_in_device_name", length = 100)
    private String clockInDeviceName;

    @Column(name = "clock_out_device_name", length = 100)
    private String clockOutDeviceName;

    @Column(name = "clock_in_source", length = 30)
    private String clockInSource;

    @Column(name = "clock_out_source", length = 30)
    private String clockOutSource;

    // ─── Geolocation (mirrors latest check-in / latest check-out of the day) ─

    @Column(name = "check_in_latitude")
    private Double checkInLatitude;

    @Column(name = "check_in_longitude")
    private Double checkInLongitude;

    @Column(name = "check_in_within_geofence")
    private Boolean checkInWithinGeofence;

    @Column(name = "check_out_latitude")
    private Double checkOutLatitude;

    @Column(name = "check_out_longitude")
    private Double checkOutLongitude;

    @Column(name = "check_out_within_geofence")
    private Boolean checkOutWithinGeofence;

    @Column(name = "check_in_accuracy_meters")
    private Double checkInAccuracyMeters;

    @Column(name = "check_out_accuracy_meters")
    private Double checkOutAccuracyMeters;

    @Column(name = "check_in_address", length = 500)
    private String checkInAddress;

    @Column(name = "check_out_address", length = 500)
    private String checkOutAddress;
}
