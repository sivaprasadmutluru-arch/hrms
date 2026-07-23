package com.example.demo.payroll.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class LoanRequestSubmitRequest {
    private String loanType;            // LoanAccount.LoanType name — LOAN, ADVANCED_SALARY, FINE
    private BigDecimal requestedAmount;
    private Integer requestedInstallments;
    private String reason;
}
