package com.example.demo.attendance.dto;

import com.example.demo.attendance.entity.Attendance;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
public class AttendanceResponse {

    private Long id;
    private Long employeeId;
    private String employeeName;
    private String employeeBadgeId;
    private LocalDate attendanceDate;
    private LocalTime checkIn;
    private LocalTime checkOut;
    private Instant checkInUtc;
    private Instant checkOutUtc;
    private Double workedHour;
    private Integer atWorkSecond;
    private Instant currentSessionStartUtc;
    private Double minimumHour;
    private Double attendanceOvertime;
    private Integer overtimeMinutes;

    // Auto-evaluated attendance quality
    private String attendanceStatus;       // REGULAR | IRREGULAR | REGULARISED
    private Integer deductionMinutes;
    private Double deductionAmount;

    // Regularisation quick-flag
    private String regularisationStatus;  // NONE | HAS_PENDING | REGULARISED

    private Long shiftId;
    private String shiftName;
    private Long workTypeId;
    private String workTypeName;
    private Long companyId;

    // Device / Source tracking
    private String clockInDeviceName;
    private String clockOutDeviceName;
    private String clockInSource;
    private String clockOutSource;

    public static AttendanceResponse from(Attendance a) {
        AttendanceResponse r = new AttendanceResponse();
        r.setId(a.getId());
        r.setAttendanceDate(a.getAttendanceDate());
        r.setCheckIn(a.getCheckIn());
        r.setCheckOut(a.getCheckOut());
        r.setCheckInUtc(a.getCheckInUtc());
        r.setCheckOutUtc(a.getCheckOutUtc());
        r.setWorkedHour(a.getWorkedHour());
        r.setAtWorkSecond(a.getAtWorkSecond());
        r.setMinimumHour(a.getMinimumHour());
        r.setAttendanceOvertime(a.getAttendanceOvertime());
        r.setOvertimeMinutes(a.getOvertimeMinutes());
        r.setAttendanceStatus(a.getAttendanceStatus() != null ? a.getAttendanceStatus().name() : null);
        r.setDeductionMinutes(a.getDeductionMinutes());
        r.setDeductionAmount(a.getDeductionAmount());
        r.setRegularisationStatus(a.getRegularisationStatus() != null ? a.getRegularisationStatus().name() : null);
        if (a.getEmployee() != null) {
            r.setEmployeeId(a.getEmployee().getId());
            r.setEmployeeName(a.getEmployee().getFirstName() + " " + a.getEmployee().getLastName());
            r.setEmployeeBadgeId(a.getEmployee().getBadgeId());
        }
        if (a.getShift() != null) {
            r.setShiftId(a.getShift().getId());
            r.setShiftName(a.getShift().getName());
        }
        if (a.getWorkType() != null) {
            r.setWorkTypeId(a.getWorkType().getId());
            r.setWorkTypeName(a.getWorkType().getName());
        }
        if (a.getCompany() != null) r.setCompanyId(a.getCompany().getId());
        r.setClockInDeviceName(a.getClockInDeviceName());
        r.setClockOutDeviceName(a.getClockOutDeviceName());
        r.setClockInSource(a.getClockInSource());
        r.setClockOutSource(a.getClockOutSource());
        return r;
    }
}
