package com.example.demo.leave.dto;

public record CreditBalanceRequest(
        Long employeeId,
        Long leaveTypeId,
        Double days
) {}
