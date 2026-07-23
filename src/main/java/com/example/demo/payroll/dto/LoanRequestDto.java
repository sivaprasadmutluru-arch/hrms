package com.example.demo.payroll.dto;

import com.example.demo.employee.entity.Employee;
import com.example.demo.payroll.entity.LoanRequest;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class LoanRequestDto {

    private Long id;
    private Long employeeId;
    private String employeeName;
    private String employeeBadgeId;
    private Long companyId;

    private String loanType;
    private BigDecimal requestedAmount;
    private Integer requestedInstallments;
    private String reason;
    private String status;

    private Long reviewedById;
    private String reviewedByName;
    private LocalDateTime reviewedAt;
    private String reviewRemarks;

    private LocalDateTime createdAt;

    public static LoanRequestDto from(LoanRequest r) {
        LoanRequestDto dto = new LoanRequestDto();
        dto.setId(r.getId());
        dto.setCompanyId(r.getCompany() != null ? r.getCompany().getId() : null);
        dto.setLoanType(r.getLoanType() != null ? r.getLoanType().name() : null);
        dto.setRequestedAmount(r.getRequestedAmount());
        dto.setRequestedInstallments(r.getRequestedInstallments());
        dto.setReason(r.getReason());
        dto.setStatus(r.getStatus() != null ? r.getStatus().name() : null);
        dto.setReviewedAt(r.getReviewedAt());
        dto.setReviewRemarks(r.getReviewRemarks());
        dto.setCreatedAt(r.getCreatedAt());

        if (r.getEmployee() != null) {
            dto.setEmployeeId(r.getEmployee().getId());
            dto.setEmployeeName(fullName(r.getEmployee()));
            dto.setEmployeeBadgeId(r.getEmployee().getBadgeId());
        }
        if (r.getReviewedBy() != null) {
            dto.setReviewedById(r.getReviewedBy().getId());
            dto.setReviewedByName(fullName(r.getReviewedBy()));
        }
        return dto;
    }

    private static String fullName(Employee e) {
        String first = e.getFirstName() != null ? e.getFirstName() : "";
        String last = e.getLastName() != null ? e.getLastName() : "";
        return (first + " " + last).trim();
    }
}
