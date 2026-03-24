package com.example.demo.attendance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
public class AttendanceRequest {

    @NotNull
    private Long employeeId;

    @NotNull
    private LocalDate attendanceDate;

    private LocalTime checkIn;
    private LocalTime checkOut;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Double workedHour;
    private Double minimumHour;
    private Long shiftId;
    private Long workTypeId;

    @NotNull
    private Long companyId;
}
