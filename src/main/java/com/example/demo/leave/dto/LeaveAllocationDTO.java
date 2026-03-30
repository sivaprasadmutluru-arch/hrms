package com.example.demo.leave.dto;

import com.example.demo.leave.entity.LeaveAllocation.AllocationStatus;

public record LeaveAllocationDTO(
        Long id,
        Long employeeId,
        String employeeName,
        Long leaveTypeId,
        String leaveTypeName,
        Double totalLeaveDays,
        Double availableDays,
        Double carryforwardDays,
        Integer year,
        AllocationStatus status
) {}
