package com.example.demo.leave.dto;

import java.time.LocalDate;

public record LeaveRestrictionDTO(
        Long id,
        String title,
        LocalDate startDate,
        LocalDate endDate,
        String description,
        Long departmentId,
        String departmentName
) {}
