package com.example.demo.payroll.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.ShiftSchedule;
import com.example.demo.base.entity.WorkType;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.Set;

@Entity
@Table(name = "allowances")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class Allowance extends BaseEntity {

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "one_time_date")
    private LocalDate oneTimeDate;

    @Column(name = "include_active_employees")
    private Boolean includeActiveEmployees = false;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "allowance_specific_employees",
            joinColumns = @JoinColumn(name = "allowance_id"),
            inverseJoinColumns = @JoinColumn(name = "employee_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Set<Employee> specificEmployees;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "allowance_excluded_employees",
            joinColumns = @JoinColumn(name = "allowance_id"),
            inverseJoinColumns = @JoinColumn(name = "employee_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Set<Employee> excludeEmployees;

    @Column(name = "is_taxable")
    private Boolean isTaxable = true;

    @Column(name = "is_condition_based")
    private Boolean isConditionBased = false;

    @Column(name = "field")
    private String field;

    @Column(name = "condition")
    private String condition;

    @Column(name = "value")
    private String value;

    @Column(name = "is_fixed")
    private Boolean isFixed = true;

    @Column(name = "amount")
    private Double amount;

    @Column(name = "based_on")
    private String basedOn = "basic_pay";

    @Column(name = "rate")
    private Double rate;

    @Column(name = "per_attendance_fixed_amount")
    private Double perAttendanceFixedAmount = 0.0;

    @Column(name = "per_children_fixed_amount")
    private Double perChildrenFixedAmount = 0.0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ShiftSchedule shift;

    @Column(name = "shift_per_attendance_amount")
    private Double shiftPerAttendanceAmount = 0.0;

    @Column(name = "amount_per_one_hr")
    private Double amountPerOneHr = 0.0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_type_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WorkType workType;

    @Column(name = "work_type_per_attendance_amount")
    private Double workTypePerAttendanceAmount = 0.0;

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

    @Column(name = "is_loan")
    private Boolean isLoan = false;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "allowance_other_conditions",
            joinColumns = @JoinColumn(name = "allowance_id"),
            inverseJoinColumns = @JoinColumn(name = "condition_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @org.hibernate.annotations.BatchSize(size = 30)
    private Set<MultipleCondition> otherConditions;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;
}
