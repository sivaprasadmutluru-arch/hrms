package com.example.demo.base.entity;

import com.example.demo.base.enums.SubscriptionPlan;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Represents a client organization (tenant) on the AccrueHr platform.
 * Each organization has one Head Office and up to 5 branch companies.
 * Example: "ABC Corp" is an Organization. "ABC Head Office" and "ABC Branch Dubai" are Companies under it.
 */
@Entity
@Table(name = "organizations", schema = "public")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Organization extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name="industry_type",nullable=false)
    private com.example.demo.base.enums.OrganizationIndustry industryType = com.example.demo.base.enums.OrganizationIndustry.GENERAL;

    @Enumerated(EnumType.STRING)
    @Column(name="employee_range")
    private com.example.demo.base.enums.EmployeeRange employeeRange;

    // Unique short identifier, e.g. "abc-corp" — used for routing and display
    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name="purchased_seats")
    private Integer purchasedSeats;

    // Subscription tier: BASIC, STANDARD, ENTERPRISE — enforced at branch/employee creation
    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_plan")
    private SubscriptionPlan subscriptionPlan = SubscriptionPlan.STANDARD;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private OrgStatus status = OrgStatus.ACTIVE;

    // Maximum number of branches allowed under this organization's Head Office
    @Column(name = "max_branches")
    private Integer maxBranches = 5;

    @Column(name = "logo_path")
    private String logoPath;

    @Column(name = "brand_color", length = 7)
    private String brandColor;

    public enum OrgStatus {
        ACTIVE,
        INACTIVE,
        SUSPENDED
    }
}
