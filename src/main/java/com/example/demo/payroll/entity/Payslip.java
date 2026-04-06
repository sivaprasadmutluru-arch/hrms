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
import java.util.Set;

@Entity
@Table(name = "payslips")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class Payslip extends BaseEntity {

    @Column(name = "group_name")
    private String groupName;

    @Column(name = "reference")
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "company",
            "jobPosition", "jobRole", "workType", "shift", "reportingManager", "user"})
    private Employee employee;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    /** Kept as extra (not in GCP) for backward compat */
    @Column(name = "pay_date")
    private LocalDate payDate;

    @Column(name = "contract_wage", precision = 12, scale = 2)
    private BigDecimal contractWage;

    @Column(name = "basic_pay", precision = 12, scale = 2)
    private BigDecimal basicPay;

    @Column(name = "gross_pay", precision = 12, scale = 2)
    private BigDecimal grossPay;

    @Column(name = "housing_allowance", precision = 12, scale = 2)
    private BigDecimal housingAllowance;

    @Column(name = "transport_allowance", precision = 12, scale = 2)
    private BigDecimal transportAllowance;

    @Column(name = "other_allowance", precision = 12, scale = 2)
    private BigDecimal otherAllowance;

    /** Total deduction (mapped to GCP's 'deduction' field) */
    @Column(name = "deduction", precision = 12, scale = 2)
    private BigDecimal deduction;

    @Column(name = "net_pay", precision = 12, scale = 2)
    private BigDecimal netPay;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private PayslipStatus status = PayslipStatus.DRAFT;

    @Column(name = "sent_to_employee")
    private Boolean sentToEmployee = false;

    @Column(name = "pay_head_data", columnDefinition = "TEXT")
    private String payHeadData;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "payslip_installment_ids",
            joinColumns = @JoinColumn(name = "payslip_id"),
            inverseJoinColumns = @JoinColumn(name = "deduction_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Set<Deduction> installmentIds;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    public enum PayslipStatus {
        DRAFT, REVIEW_ONGOING, CONFIRMED, PAID
    }
}
