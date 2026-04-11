package com.example.demo.payroll.entity;

import com.example.demo.base.entity.*;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "contracts")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class Contract extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "company", "department",
            "jobPosition", "jobRole", "workType", "shift", "reportingManager", "user"})
    private Employee employee;

    @Column(name = "contract_name")
    private String contractName;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "wage", precision = 12, scale = 2)
    private BigDecimal wage;

    @Enumerated(EnumType.STRING)
    @Column(name = "wage_type")
    private WageType wageType = WageType.MONTHLY;

    @Enumerated(EnumType.STRING)
    @Column(name = "pay_frequency")
    private PayFrequency payFrequency = PayFrequency.MONTHLY;

    @Column(name = "housing_allowance", precision = 12, scale = 2)
    private BigDecimal housingAllowance;

    @Column(name = "transport_allowance", precision = 12, scale = 2)
    private BigDecimal transportAllowance;

    @Column(name = "other_allowance", precision = 12, scale = 2)
    private BigDecimal otherAllowance;

    @Column(name = "total_salary", precision = 12, scale = 2)
    private BigDecimal totalSalary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filing_status_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private FilingStatus filingStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_status")
    private ContractStatus contractStatus = ContractStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_position_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private JobPosition jobPosition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_role_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private JobRole jobRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ShiftSchedule shift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_type_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WorkType workType;

    @Column(name = "notice_period_in_days")
    private Integer noticePeriodInDays = 30;

    @Column(name = "contract_document")
    private String contractDocument;

    @Column(name = "deduct_leave_from_basic_pay")
    private Boolean deductLeaveFromBasicPay = true;

    @Column(name = "calculate_daily_leave_amount")
    private Boolean calculateDailyLeaveAmount = true;

    @Column(name = "deduction_for_one_leave_amount", precision = 12, scale = 2)
    private BigDecimal deductionForOneLeaveAmount;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    public enum WageType {
        MONTHLY, HOURLY, DAILY
    }

    public enum PayFrequency {
        WEEKLY, MONTHLY, SEMI_MONTHLY
    }

    public enum ContractStatus {
        DRAFT, ACTIVE, EXPIRED, TERMINATED
    }
}
