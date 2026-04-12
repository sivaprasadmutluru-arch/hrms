package com.example.demo.payroll.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "payroll_loan_accounts")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class LoanAccount extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "loan_type", nullable = false)
    private LoanType loanType = LoanType.LOAN;

    @Column(name = "title", nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "company", "department",
            "jobPosition", "jobRole", "workType", "shift", "reportingManager", "user"})
    private Employee employee;

    @Column(name = "loan_amount", precision = 12, scale = 2)
    private BigDecimal loanAmount;

    @Column(name = "provided_date")
    private LocalDate providedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allowance_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Allowance allowance;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "loan_account_deduction_ids",
            joinColumns = @JoinColumn(name = "loan_account_id"),
            inverseJoinColumns = @JoinColumn(name = "deduction_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Set<Deduction> deductionIds;

    @Column(name = "is_fixed")
    private Boolean isFixed = true;

    @Column(name = "rate")
    private Double rate = 0.0;

    @Column(name = "apply_on")
    private String applyOn = "end_of_month";

    @Column(name = "installment_start_date")
    private LocalDate installmentStartDate;

    @Column(name = "installment_amount", precision = 12, scale = 2)
    private BigDecimal installmentAmount;

    @Column(name = "installments")
    private Integer installments;

    @Column(name = "settled")
    private Boolean settled = false;

    @Column(name = "settled_date")
    private LocalDateTime settledDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    /** Computed at query time — not persisted. Mirrors GCP installment_ratio numerator. */
    @Transient
    private Integer paidInstallments;

    public enum LoanType {
        LOAN, ADVANCED_SALARY, FINE
    }
}
