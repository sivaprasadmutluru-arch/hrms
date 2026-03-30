package com.example.demo.leave.dto;

import com.example.demo.leave.entity.CompensatoryLeaveRequest.CompensatoryLeaveStatus;

import java.time.LocalDate;

public record CompensatoryLeaveRequestDTO(
        Long id,
        Long employeeId,
        String employeeName,
        Long leaveTypeId,
        String leaveTypeName,
        Double requestedDays,
        LocalDate requestedDate,
        CompensatoryLeaveStatus status,
        String description,
        String rejectReason
) {}
