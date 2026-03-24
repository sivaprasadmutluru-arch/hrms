package com.example.demo.payroll.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "deductions")
@Getter
@Setter
public class Deduction extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "amount_type")
    private AmountType amountType = AmountType.FIXED;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "percentage")
    private Double percentage;

    @Column(name = "is_pretax")
    private Boolean isPretax = false;

    @Column(name = "is_tax")
    private Boolean isTax = false;

    @Column(name = "employer_rate")
    private Double employerRate;

    @Column(name = "employee_rate")
    private Double employeeRate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    public enum AmountType {
        FIXED, PERCENTAGE
    }
}
