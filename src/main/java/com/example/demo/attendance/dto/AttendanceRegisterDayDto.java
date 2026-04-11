package com.example.demo.attendance.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AttendanceRegisterDayDto {
    private Long attendanceId;
    /** P = Present, A = Absent, L = Late, WO = Weekly Off, H = Holiday, OL = On Leave, - = Future */
    private String displayStatus;
    /** Same dayType values as AttendanceCalendarDayDto */
    private String dayType;
    private boolean isLate;
}
