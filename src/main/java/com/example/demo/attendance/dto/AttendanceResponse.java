package com.example.demo.attendance.dto;

import com.example.demo.attendance.entity.Attendance;
import lombok.Getter;
import lombok.Setter;

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
    private Double workedHour;
    private Double minimumHour;
    private Double attendanceOvertime;
    private Boolean attendanceOvertimeApprove;
    private String attendanceValidated;
    private Long shiftId;
    private String shiftName;
    private Long workTypeId;
    private String workTypeName;
    private Long companyId;
    private Boolean isValidateRequest;
    private Boolean isValidateRequestApproved;

    public static AttendanceResponse from(Attendance a) {
        AttendanceResponse r = new AttendanceResponse();
        r.setId(a.getId());
        r.setAttendanceDate(a.getAttendanceDate());
        r.setCheckIn(a.getCheckIn());
        r.setCheckOut(a.getCheckOut());
        r.setWorkedHour(a.getWorkedHour());
        r.setMinimumHour(a.getMinimumHour());
        r.setAttendanceOvertime(a.getAttendanceOvertime());
        r.setAttendanceOvertimeApprove(a.getAttendanceOvertimeApprove());
        r.setAttendanceValidated(a.getAttendanceValidated() != null ? a.getAttendanceValidated().name() : null);
        r.setIsValidateRequest(a.getIsValidateRequest());
        r.setIsValidateRequestApproved(a.getIsValidateRequestApproved());
        if (a.getEmployee() != null) {
            r.setEmployeeId(a.getEmployee().getId());
            r.setEmployeeName(a.getEmployee().getFirstName() + " " + a.getEmployee().getLastName());
            r.setEmployeeBadgeId(a.getEmployee().getBadgeId());
        }
        if (a.getShift() != null) { r.setShiftId(a.getShift().getId()); r.setShiftName(a.getShift().getName()); }
        if (a.getWorkType() != null) { r.setWorkTypeId(a.getWorkType().getId()); r.setWorkTypeName(a.getWorkType().getName()); }
        if (a.getCompany() != null) r.setCompanyId(a.getCompany().getId());
        return r;
    }
}
