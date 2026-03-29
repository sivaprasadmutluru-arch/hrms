package com.example.demo.attendance.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
public class AttendanceCalendarDayDto {

    private LocalDate date;
    private String dateName;
    private Long attendanceId;
    private LocalTime checkIn;
    private LocalDate checkInDate;
    private LocalTime checkOut;
    private LocalDate checkOutDate;
    private String shiftName;
    private String workTypeName;
    private Double minimumHour;
    private Double workedHour;
    private Double pendingHour;
    private Double overtime;
    private List<String> types;
    private int penalties;
    private String status;
    private String rowClass;
}
