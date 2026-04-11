package com.example.demo.attendance.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class AttendanceRegisterRowDto {
    private Long employeeId;
    private String name;
    private String department;
    private String avatarUrl;
    /** Key = "YYYY-MM-DD", Value = day cell data */
    private Map<String, AttendanceRegisterDayDto> days;
    private int presentCount;
    private int absentCount;
    private int lateCount;
    private int leaveCount;
}
