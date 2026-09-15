package com.example.demo.auth.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

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

    /** Functional access granted inside the selected company. */
    @Enumerated(EnumType.STRING)
    // Nullable for rolling deployment; legacy rows are interpreted as FULL.
    @Column(name = "access_level", length = 20)
    private AccessLevel accessLevel = AccessLevel.FULL;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "team_id")
    private Long teamId;

    @Column(name = "employee_scope_id")
    private Long employeeScopeId;

    // Kept nullable at ORM level for rolling upgrades: the SQL migration
    // backfills legacy rows before adding the database NOT NULL constraint.
    @Column(name = "effective_from")
    private LocalDate effectiveFrom = LocalDate.now();

    @Column(name = "expires_on")
    private LocalDate expiresOn;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_status", length = 20)
    private AssignmentStatus assignmentStatus = AssignmentStatus.ACTIVE;

    @Column(name = "granted_by_user_id")
    private Long grantedByUserId;

    @Column(name = "assignment_reason", length = 500)
    private String assignmentReason;

    public enum AccessScope {
        SELF,         // Employee: see only own records
        DEPARTMENT,   // Team Lead / Department Manager: see own department
        BRANCH,       // Branch Admin / Branch HR / Branch Accountant: see whole branch
        HEAD_OFFICE,  // Head Office HR / Accountant: see HO + all branches
        ENTERPRISE    // Enterprise Admin: see everything in the organization
    }

    public enum AccessLevel {
        FULL,
        PARTIAL // Account Manager access excluding every payroll endpoint/permission
    }

    public enum AssignmentStatus { PENDING, ACTIVE, REVOKED, EXPIRED }

    public boolean isEffectiveOn(LocalDate date) {
        // Null is treated as active only for legacy rows during the migration
        // window. The repeatable migration backfills it to ACTIVE.
        return (assignmentStatus == null || assignmentStatus == AssignmentStatus.ACTIVE)
                && (effectiveFrom == null || !effectiveFrom.isAfter(date))
                && (expiresOn == null || !expiresOn.isBefore(date));
    }
}
