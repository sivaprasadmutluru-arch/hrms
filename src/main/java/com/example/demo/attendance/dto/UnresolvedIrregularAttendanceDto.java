package com.example.demo.attendance.dto;

import com.example.demo.attendance.entity.Attendance;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
public class UnresolvedIrregularAttendanceDto {

    private Long attendanceId;
    private LocalDate attendanceDate;
    private LocalTime checkIn;
    private LocalTime checkOut;

    public static UnresolvedIrregularAttendanceDto from(Attendance a) {
        UnresolvedIrregularAttendanceDto dto = new UnresolvedIrregularAttendanceDto();
        dto.setAttendanceId(a.getId());
        dto.setAttendanceDate(a.getAttendanceDate());
        dto.setCheckIn(a.getCheckIn());
        dto.setCheckOut(a.getCheckOut());
        return dto;
    }
}
