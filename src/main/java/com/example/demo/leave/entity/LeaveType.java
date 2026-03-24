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
    private Integer carryforwardMax;

    @Column(name = "leave_validation_type")
    @Enumerated(EnumType.STRING)
    private LeaveValidationType leaveValidationType = LeaveValidationType.AUTOMATIC;

    @Column(name = "exclude_company_leave")
    private Boolean excludeCompanyLeave = true;

    @Column(name = "exclude_holiday")
    private Boolean excludeHoliday = true;

    // When true, Head Office created this leave type and it applies to all branches
    @Column(name = "is_organization_wide")
    private Boolean isOrganizationWide = false;

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
}
