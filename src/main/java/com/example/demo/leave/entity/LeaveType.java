package com.example.demo.leave.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "leave_types")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class LeaveType extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "color_code")
    private String colorCode;

    @Column(name = "total_days")
    private Integer totalDays;

    @Column(name = "payment_type")
    @Enumerated(EnumType.STRING)
    private PaymentType paymentType = PaymentType.PAID;

    @Column(name = "carryforward_type")
    @Enumerated(EnumType.STRING)
    private CarryforwardType carryforwardType = CarryforwardType.NO_CARRYFORWARD;

    @Column(name = "carryforward_max")
    private Double carryforwardMax;

    // Reset configuration (mirrors Horilla reset/reset_based/reset_day/reset_month/reset_weekend)
    @Column(name = "reset")
    private Boolean reset = false;

    @Column(name = "reset_based")
    private String resetBased; // "monthly", "weekly", "yearly"

    @Column(name = "reset_month")
    private String resetMonth; // "1".."12"

    @Column(name = "reset_day")
    private String resetDay; // "1".."31" or "last day"

    @Column(name = "reset_weekend")
    private String resetWeekend; // "0"=Monday .. "6"=Sunday (for weekly reset)

    // Carryforward expiry configuration
    @Column(name = "carryforward_expire_in")
    private Integer carryforwardExpireIn;

    @Column(name = "carryforward_expire_period")
    private String carryforwardExpirePeriod; // "day", "month", "year"

    @Column(name = "carryforward_expire_date")
    private java.time.LocalDate carryforwardExpireDate;

    @Column(name = "require_attachment")
    private Boolean requireAttachment = false;

    @Column(name = "limit_leave")
    private Boolean limitLeave = true;

    @Column(name = "is_encashable")
    private Boolean isEncashable = false;

    @Column(name = "leave_validation_type")
    @Enumerated(EnumType.STRING)
    private LeaveValidationType leaveValidationType = LeaveValidationType.AUTOMATIC;

    @Column(name = "exclude_company_leave")
    private Boolean excludeCompanyLeave = true;

    @Column(name = "exclude_weekend")
    private Boolean excludeWeekend = true;

    @Column(name = "exclude_holiday")
    private Boolean excludeHoliday = true;

    // When true, Head Office created this leave type and it applies to all branches
    @Column(name = "is_organization_wide")
    private Boolean isOrganizationWide = false;

    // Employee categories this leave type applies to (empty = all categories)
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "leave_type_employee_types",
            joinColumns = @JoinColumn(name = "leave_type_id"),
            inverseJoinColumns = @JoinColumn(name = "employee_type_id")
    )
    private java.util.List<com.example.demo.base.entity.EmployeeType> applicableEmployeeTypes = new java.util.ArrayList<>();

    // ─── Accrual Settings ─────────────────────────────────────────────────────

    /** If true, leave accrues monthly instead of being allocated upfront */
    @Column(name = "accrual_enabled")
    private Boolean accrualEnabled = false;

    /** How mid-year joiners are handled: MANUAL (HR sets opening balance) or AUTO_PRORATA */
    @Column(name = "mid_year_joiner_mode")
    @Enumerated(EnumType.STRING)
    private MidYearJoinerMode midYearJoinerMode = MidYearJoinerMode.MANUAL;

    /** When the monthly credit becomes available to employees. */
    @Column(name = "accrual_posting_timing")
    @Enumerated(EnumType.STRING)
    private AccrualPostingTiming accrualPostingTiming = AccrualPostingTiming.END_OF_MONTH;

    /** Legacy fixed monthly rounding, or reconcile the 12 monthly credits to the annual entitlement. */
    @Column(name = "accrual_calculation_method")
    @Enumerated(EnumType.STRING)
    private AccrualCalculationMethod accrualCalculationMethod = AccrualCalculationMethod.FIXED_MONTHLY;

    /** Number of decimal places retained for each monthly credit (1 or 2). */
    @Column(name = "accrual_precision")
    private Integer accrualPrecision = 1;

    /** Basis used to calculate a new joiner's first partial month. */
    @Column(name = "accrual_proration_basis")
    @Enumerated(EnumType.STRING)
    private AccrualProrationBasis accrualProrationBasis = AccrualProrationBasis.CALENDAR_DAYS;

    /** First month eligible for automatic credits; null keeps legacy immediate behaviour. */
    @Column(name = "accrual_start_date")
    private java.time.LocalDate accrualStartDate;

    /** If true, employees can go negative on leave balance */
    @Column(name = "negative_balance_allowed")
    private Boolean negativeBalanceAllowed = false;

    /** Maximum negative balance allowed (null = unlimited when negativeBalanceAllowed=true) */
    @Column(name = "negative_balance_limit")
    private Double negativeBalanceLimit;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    public enum PaymentType {
        PAID, UNPAID
    }

    public enum CarryforwardType {
        NO_CARRYFORWARD, CARRYFORWARD, CARRYFORWARD_EXPIRE
    }

    public enum LeaveValidationType {
        AUTOMATIC, MANAGER_VALIDATION, HR_VALIDATION
    }

    public enum MidYearJoinerMode {
        MANUAL, AUTO_PRORATA
    }

    public enum AccrualPostingTiming { START_OF_MONTH, END_OF_MONTH }
    public enum AccrualCalculationMethod { FIXED_MONTHLY, ANNUAL_CAP_RECONCILED }
    public enum AccrualProrationBasis { CALENDAR_DAYS, WORKING_DAYS }
}
