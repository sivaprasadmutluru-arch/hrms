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

@Entity
@Table(name = "payroll_gratuity_calculations")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class GratuityCalculation extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "company", "department",
            "jobPosition", "jobRole", "workType", "shift", "reportingManager", "user"})
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    @Column(name = "joining_date", nullable = false)
    private LocalDate joiningDate;

    @Column(name = "last_working_date", nullable = false)
    private LocalDate lastWorkingDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type")
    private ContractType contractType = ContractType.UNLIMITED;

    // --- Service period breakdown ---
    @Column(name = "completed_years")
    private Integer completedYears;

    @Column(name = "completed_months")
    private Integer completedMonths;

    @Column(name = "completed_days")
    private Integer completedDays;

    // --- Salary inputs ---
    @Column(name = "basic_salary", precision = 12, scale = 2)
    private BigDecimal basicSalary;

    @Column(name = "daily_basic_salary", precision = 12, scale = 4)
    private BigDecimal dailyBasicSalary;

    // --- Gratuity computation ---
    @Column(name = "gratuity_days", precision = 10, scale = 4)
    private BigDecimal gratuityDays;

    @Column(name = "gratuity_amount", precision = 12, scale = 2)
    private BigDecimal gratuityAmount;

    // --- Additional settlement items ---
    @Column(name = "leave_encashment_days", precision = 10, scale = 2)
    private BigDecimal leaveEncashmentDays = BigDecimal.ZERO;

    @Column(name = "leave_encashment_amount", precision = 12, scale = 2)
    private BigDecimal leaveEncashmentAmount = BigDecimal.ZERO;

    @Column(name = "pending_salary", precision = 12, scale = 2)
    private BigDecimal pendingSalary = BigDecimal.ZERO;

    @Column(name = "air_ticket_allowance", precision = 12, scale = 2)
    private BigDecimal airTicketAllowance = BigDecimal.ZERO;

    // --- Deductions ---
    @Column(name = "loan_deduction", precision = 12, scale = 2)
    private BigDecimal loanDeduction = BigDecimal.ZERO;

    @Column(name = "notice_period_deduction", precision = 12, scale = 2)
    private BigDecimal noticePeriodDeduction = BigDecimal.ZERO;

    @Column(name = "other_deductions", precision = 12, scale = 2)
    private BigDecimal otherDeductions = BigDecimal.ZERO;

    // --- Final ---
    @Column(name = "final_settlement_amount", precision = 12, scale = 2)
    private BigDecimal finalSettlementAmount;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private GratuityStatus status = GratuityStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "company", "department",
            "jobPosition", "jobRole", "workType", "shift", "reportingManager", "user"})
    private Employee approvedBy;

    public enum ContractType {
        LIMITED, UNLIMITED
    }

    public enum GratuityStatus {
        DRAFT, APPROVED
    }
}
