package com.example.demo.leave.dto;

public record BulkAllocateRequest(
        Long companyId,
        Long leaveTypeId,
        Double days,
        Integer year
) {}
