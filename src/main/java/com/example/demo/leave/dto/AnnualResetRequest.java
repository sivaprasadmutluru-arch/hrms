package com.example.demo.leave.dto;

public record AnnualResetRequest(
        Long companyId,
        Integer year
) {}
