package com.example.demo.leave.dto;

public record AllocateLeaveRequest(
        Long employeeId,
        Long leaveTypeId,
        Double days,
        Integer year,
        Long companyId
) {}
