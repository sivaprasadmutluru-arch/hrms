package com.example.demo.payroll.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Set;

@Entity
@Table(name = "deductions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class Deduction extends BaseEntity {

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "one_time_date")
    private LocalDate oneTimeDate;

    @Column(name = "include_active_employees")
    private Boolean includeActiveEmployees = false;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "deduction_specific_employees",
            joinColumns = @JoinColumn(name = "deduction_id"),
            inverseJoinColumns = @JoinColumn(name = "employee_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Set<Employee> specificEmployees;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "deduction_excluded_employees",
            joinColumns = @JoinColumn(name = "deduction_id"),
            inverseJoinColumns = @JoinColumn(name = "employee_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Set<Employee> excludeEmployees;

    @Column(name = "is_tax")
    private Boolean isTax = false;

    @Column(name = "is_pretax")
    private Boolean isPretax = true;

    @Column(name = "is_condition_based")
    private Boolean isConditionBased = false;

    @Column(name = "field")
    private String field;

    @Column(name = "condition")
    private String condition;

    @Column(name = "value")
    private String value;

    @Column(name = "update_compensation")
    private String updateCompensation;

    @Column(name = "is_fixed")
    private Boolean isFixed = true;

    @Column(name = "amount")
    private Double amount;

    @Column(name = "based_on")
    private String basedOn;

    /** Employee rate (percentage of based_on) */
    @Column(name = "rate")
    private Double rate = 0.0;

    @Column(name = "employer_rate")
    private Double employerRate = 0.0;

    @Column(name = "has_max_limit")
    private Boolean hasMaxLimit = false;

    @Column(name = "maximum_amount")
    private Double maximumAmount;

    @Column(name = "maximum_unit")
    private String maximumUnit = "month_working_days";

    @Column(name = "if_choice")
    private String ifChoice = "basic_pay";

    @Column(name = "if_condition")
    private String ifCondition = "gt";

    @Column(name = "if_amount")
    private Double ifAmount = 0.0;

    @Column(name = "start_range")
    private Double startRange;

    @Column(name = "end_range")
    private Double endRange;

    @Column(name = "only_show_under_employee")
    private Boolean onlyShowUnderEmployee = false;

    @Column(name = "is_installment")
    private Boolean isInstallment = false;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "deduction_other_conditions",
            joinColumns = @JoinColumn(name = "deduction_id"),
            inverseJoinColumns = @JoinColumn(name = "condition_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Set<MultipleCondition> otherConditions;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;
}
