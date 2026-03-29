package com.example.demo.payroll.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "payroll_encashment_settings",
        uniqueConstraints = @UniqueConstraint(columnNames = "company_id"))
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class EncashmentGeneralSetting extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    /** If true employees can request leave encashment themselves */
    @Column(name = "enable_self_encashment")
    private Boolean enableSelfEncashment = false;

    /** Maximum leave days that can be encashed per year */
    @Column(name = "max_encashment_days")
    private Integer maxEncashmentDays;

    /** Minimum accrued leave days required before encashment is allowed */
    @Column(name = "min_accrual_before_encashment")
    private Integer minAccrualBeforeEncashment;

    /** Amount per bonus point for encashment (GCP: bonus_amount) */
    @Column(name = "bonus_amount")
    private Integer bonusAmount = 1;

    /** Amount per leave day for encashment (GCP: leave_amount) */
    @Column(name = "leave_amount")
    private Integer leaveAmount;
}
