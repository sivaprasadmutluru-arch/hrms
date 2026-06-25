package com.example.demo.attendance.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalTime;

@Getter
@Setter
public class RegularisationSubmitRequest {
    private Long attendanceId;          // required for all types
    private String requestType;         // AttendanceRegularisationRequest.RequestType name
    private String reason;
    private String attachmentUrl;
    private LocalTime requestedCheckIn;   // for MISSING_PUNCH / WORKING_HOURS_CORRECTION
    private LocalTime requestedCheckOut;
    private Double requestedOvertimeHours; // for OVERTIME_REQUEST
}
