package com.example.demo.leave.dto;

import java.time.LocalDate;

public record AvailableLeaveDTO(
        Long id,
        Long employeeId,
        String employeeName,
        Long leaveTypeId,
        String leaveTypeName,
        Double availableDays,
        Double carryforwardDays,
        Double totalLeaveDays,
        LocalDate assignedDate,
        LocalDate resetDate,
        LocalDate expiredDate
) {}
