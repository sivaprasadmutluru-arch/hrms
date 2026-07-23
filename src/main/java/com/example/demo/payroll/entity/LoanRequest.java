package com.example.demo.payroll.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * An employee's self-service request to be given a loan/advance/fine — the
 * self-service counterpart to {@link LoanAccount}, which HR/Admin manage directly.
 * Approving a request does not create a LoanAccount automatically; HR/Admin still
 * creates it manually via Loan Accounts, referencing the approved request.
 */
@Entity
@Table(name = "loan_requests", indexes = {
        @Index(name = "idx_loan_req_employee", columnList = "employee_id"),
        @Index(name = "idx_loan_req_company",  columnList = "company_id"),
        @Index(name = "idx_loan_req_status",   columnList = "status")
})
@Getter
@Setter
public class LoanRequest extends BaseEntity {

    public enum RequestStatus {
        PENDING, APPROVED, REJECTED
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(name = "loan_type", nullable = false)
    private LoanAccount.LoanType loanType;

    @Column(name = "requested_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal requestedAmount;

    @Column(name = "requested_installments")
    private Integer requestedInstallments;

    @Column(name = "reason", columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 15)
    private RequestStatus status = RequestStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private Employee reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_remarks", columnDefinition = "TEXT")
    private String reviewRemarks;
}
