package com.example.demo.attendance.dto;

import com.example.demo.attendance.entity.Attendance;
import com.example.demo.employee.entity.Employee;
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
    private String companyName;

    // Device / Source tracking
    private String clockInDeviceName;
    private String clockOutDeviceName;
    private String clockInSource;
    private String clockOutSource;

    // Geolocation captured at punch time
    private Double checkInLatitude;
    private Double checkInLongitude;
    private Boolean checkInWithinGeofence;
    private Double checkOutLatitude;
    private Double checkOutLongitude;
    private Boolean checkOutWithinGeofence;
    private Double checkInAccuracyMeters;
    private Double checkOutAccuracyMeters;
    private String checkInAddress;
    private String checkOutAddress;

    // Full-view only: REGULAR | IRREGULAR | REGULARISED | ABSENT | ON_LEAVE | HOLIDAY
    private String displayStatus;
    private String leaveTypeName;

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
            // Some legacy/device-created attendance rows have no company link,
            // which previously left Branch blank. Preserve a recorded branch
            // when present; otherwise fall back to the employee's branch.
            if (a.getCompany() == null && a.getEmployee().getCompany() != null) {
                r.setCompanyId(a.getEmployee().getCompany().getId());
                r.setCompanyName(a.getEmployee().getCompany().getName());
            }
        }
        if (a.getShift() != null) {
            r.setShiftId(a.getShift().getId());
            r.setShiftName(a.getShift().getName());
        }
        if (a.getWorkType() != null) {
            r.setWorkTypeId(a.getWorkType().getId());
            r.setWorkTypeName(a.getWorkType().getName());
        }
        if (r.getCompanyId() == null && a.getCompany() != null) {
            r.setCompanyId(a.getCompany().getId());
            r.setCompanyName(a.getCompany().getName());
        }
        r.setClockInDeviceName(a.getClockInDeviceName());
        r.setClockOutDeviceName(a.getClockOutDeviceName());
        r.setClockInSource(a.getClockInSource());
        r.setClockOutSource(a.getClockOutSource());
        r.setCheckInLatitude(a.getCheckInLatitude());
        r.setCheckInLongitude(a.getCheckInLongitude());
        r.setCheckInWithinGeofence(a.getCheckInWithinGeofence());
        r.setCheckOutLatitude(a.getCheckOutLatitude());
        r.setCheckOutLongitude(a.getCheckOutLongitude());
        r.setCheckOutWithinGeofence(a.getCheckOutWithinGeofence());
        r.setCheckInAccuracyMeters(a.getCheckInAccuracyMeters());
        r.setCheckOutAccuracyMeters(a.getCheckOutAccuracyMeters());
        r.setCheckInAddress(a.getCheckInAddress());
        r.setCheckOutAddress(a.getCheckOutAddress());
        r.setDisplayStatus(a.getAttendanceStatus() != null ? a.getAttendanceStatus().name() : "REGULAR");
        return r;
    }

    public static AttendanceResponse fromVirtual(Employee emp, java.time.LocalDate date, String displayStatus, String leaveTypeName) {
        AttendanceResponse r = new AttendanceResponse();
        r.setEmployeeId(emp.getId());
        r.setEmployeeName(emp.getFirstName() + " " + (emp.getLastName() != null ? emp.getLastName() : ""));
        r.setEmployeeBadgeId(emp.getBadgeId());
        r.setAttendanceDate(date);
        r.setDisplayStatus(displayStatus);
        r.setLeaveTypeName(leaveTypeName);
        if (emp.getCompany() != null) {
            r.setCompanyId(emp.getCompany().getId());
            r.setCompanyName(emp.getCompany().getName());
        }
        return r;
    }
}
