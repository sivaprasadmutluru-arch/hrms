package com.example.demo.leave.dto;

import java.time.LocalDate;

public record ApplyLeaveRequest(
        Long employeeId,
        Long leaveTypeId,
        LocalDate startDate,
        LocalDate endDate,
        String description,
        Long companyId
) {}
