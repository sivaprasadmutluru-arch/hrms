package com.example.demo.auth.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Links a user to a role within a company, with a defined access scope.
 *
 * The scope controls what data the user can see:
 *   SELF        → only their own data (Employee)
 *   DEPARTMENT  → their department's data (Team Lead, Department Manager)
 *   BRANCH      → all data in their branch (Branch Admin, Branch HR, Branch Accountant)
 *   HEAD_OFFICE → Head Office data + all branches (HO HR Manager, HO Accountant)
 *   ENTERPRISE  → everything across the entire organization (Enterprise Admin)
 *
 * Example row:
 *   user_id=5, role=BRANCH_ADMIN, company_id=3 (Branch Dubai), scope=BRANCH
 *   → This user manages Branch Dubai only.
 *
 * Example row:
 *   user_id=2, role=ENTERPRISE_ADMIN, company_id=1 (Head Office), scope=ENTERPRISE
 *   → This user sees all branches under the Head Office.
 */
@Entity
@Table(
    name = "user_roles",
    schema = "public",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "role_id", "company_id"})
)
@Getter
@Setter
public class UserRole extends BaseEntity {

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    // The company this role assignment is scoped to (can be Head Office or a Branch)
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    // Defines how much data this user can see within their company/organization
    @Enumerated(EnumType.STRING)
    @Column(name = "access_scope")
    private AccessScope accessScope;

    public enum AccessScope {
        SELF,         // Employee: see only own records
        DEPARTMENT,   // Team Lead / Department Manager: see own department
        BRANCH,       // Branch Admin / Branch HR / Branch Accountant: see whole branch
        HEAD_OFFICE,  // Head Office HR / Accountant: see HO + all branches
        ENTERPRISE    // Enterprise Admin: see everything in the organization
    }
}
