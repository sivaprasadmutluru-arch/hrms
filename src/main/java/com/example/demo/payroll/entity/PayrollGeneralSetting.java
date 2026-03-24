package com.example.demo.payroll.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "payroll_general_settings",
        uniqueConstraints = @UniqueConstraint(columnNames = "company_id"))
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class PayrollGeneralSetting extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    /** Round payroll figures to nearest integer */
    @Column(name = "round_off")
    private Boolean roundOff = false;

    /** Enable leave encashment feature */
    @Column(name = "enable_encashment")
    private Boolean enableEncashment = false;

    /** Enable bonus point feature */
    @Column(name = "enable_bonus_point")
    private Boolean enableBonusPoint = false;

    /** Maximum overtime hours allowed per period */
    @Column(name = "max_overtime_hours")
    private Double maxOvertimeHours;

    /** Date from which payroll is calculated each month (1-31) */
    @Column(name = "payroll_start_day")
    private Integer payrollStartDay = 1;
}
