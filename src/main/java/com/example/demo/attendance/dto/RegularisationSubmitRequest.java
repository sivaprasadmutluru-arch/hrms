package com.example.demo.attendance.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
public class RegularisationSubmitRequest {
    private Long attendanceId;          // required unless attendanceDate is given (no attendance row yet)
    private LocalDate attendanceDate;   // required when attendanceId is null — e.g. requesting for an Absent/On Leave/Holiday/Week Off day
    private String requestType;         // AttendanceRegularisationRequest.RequestType name
    private String reason;
    private String attachmentUrl;
    private LocalTime requestedCheckIn;   // for MISSING_PUNCH / WORKING_HOURS_CORRECTION, required when attendanceId is null
    private LocalTime requestedCheckOut;
    private Double requestedOvertimeHours; // for OVERTIME_REQUEST
}
