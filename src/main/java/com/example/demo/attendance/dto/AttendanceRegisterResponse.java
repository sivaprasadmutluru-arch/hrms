package com.example.demo.attendance.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AttendanceRegisterResponse {
    private List<String> dates;
    private List<AttendanceRegisterRowDto> employees;
    private int year;
    private int month;
    private String monthLabel;
}
