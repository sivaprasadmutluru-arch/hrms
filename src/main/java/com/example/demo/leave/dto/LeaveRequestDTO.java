package com.example.demo.leave.dto;

import com.example.demo.leave.entity.LeaveRequest.LeaveStatus;

import java.time.LocalDate;

public record LeaveRequestDTO(
        Long id,
        Long employeeId,
        String employeeName,
        Long leaveTypeId,
        String leaveTypeName,
        LocalDate startDate,
        LocalDate endDate,
        Double requestedDays,
        LeaveStatus status,
        String description,
        String rejectReason
) {}
