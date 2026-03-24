package com.example.demo.payroll.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "allowances")
@Getter
@Setter
public class Allowance extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "amount_type")
    private AmountType amountType = AmountType.FIXED;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "percentage")
    private Double percentage;

    @Column(name = "is_taxable")
    private Boolean isTaxable = false;

    @Column(name = "is_condition_based")
    private Boolean isConditionBased = false;

    @Column(name = "condition_field")
    private String conditionField;

    @Column(name = "condition_operator")
    private String conditionOperator;

    @Column(name = "condition_value")
    private String conditionValue;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    public enum AmountType {
        FIXED, PERCENTAGE
    }
}
