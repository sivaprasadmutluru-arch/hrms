package com.example.demo.leave.dto;

import com.example.demo.leave.entity.LeaveAllocationRequest.AllocationStatus;

import java.time.LocalDate;

public record LeaveAllocationRequestDTO(
        Long id,
        Long employeeId,
        String employeeName,
        Long leaveTypeId,
        String leaveTypeName,
        Double requestedDays,
        LocalDate requestedDate,
        AllocationStatus status,
        String description,
        String rejectReason,
        String allocationAction,
        Long sourceRequestId,
        String lifecycleStatus,
        Double appliedDays
) {}
