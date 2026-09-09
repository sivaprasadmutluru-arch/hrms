package com.example.demo.leave.dto;

import java.time.LocalDate;
import com.example.demo.leave.entity.LeaveRequest.LeaveDuration;

public record ApplyLeaveRequest(
        Long employeeId,
        Long leaveTypeId,
        LocalDate startDate,
        LocalDate endDate,
        LeaveDuration leaveDuration,
        String description,
        Long companyId
) {}
