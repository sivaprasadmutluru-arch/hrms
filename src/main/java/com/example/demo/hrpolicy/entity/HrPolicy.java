package com.example.demo.hrpolicy.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * HR Policy created by Head Office.
 * If isOrganizationWide = true, all branches under the same organization can see it.
 * If isOrganizationWide = false, it belongs to a single company only.
 */
@Entity
@Table(name = "hr_policies")
@Getter
@Setter
public class HrPolicy extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PolicyCategory category = PolicyCategory.GENERAL;

    // When true, Head Office created this policy and all branches inherit it
    @Column(name = "is_organization_wide")
    private Boolean isOrganizationWide = false;

    @Column(name = "is_published")
    private Boolean isPublished = false;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    public enum PolicyCategory {
        GENERAL, LEAVE, ATTENDANCE, PAYROLL, CODE_OF_CONDUCT, SAFETY, RECRUITMENT
    }
}
