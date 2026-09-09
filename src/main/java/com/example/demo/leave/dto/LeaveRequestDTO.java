package com.example.demo.leave.dto;

import com.example.demo.leave.entity.LeaveRequest.LeaveStatus;
import com.example.demo.leave.entity.LeaveRequest.LeaveDuration;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record LeaveRequestDTO(
        Long id,
        Long employeeId,
        String employeeName,
        Long leaveTypeId,
        String leaveTypeName,
        LocalDate startDate,
        LocalDate endDate,
        Double requestedDays,
        LeaveDuration leaveDuration,
        LeaveStatus status,
        String description,
        String rejectReason,
        String departmentName,
        Long companyId,
        String approvedByName,
        LocalDateTime createdAt
) {}
