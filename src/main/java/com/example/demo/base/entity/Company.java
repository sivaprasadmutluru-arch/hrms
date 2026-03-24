package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a company within an organization.
 *
 * Two types:
 *   HEAD_OFFICE — the master company. Can create branches, control policies, view all branch data.
 *   BRANCH      — child company under a Head Office. Can only manage its own data.
 *
 * Example:
 *   Organization: ABC Corp
 *     ├── Company: ABC Head Office  (type = HEAD_OFFICE)
 *     ├── Company: ABC Dubai        (type = BRANCH, parentCompany = Head Office)
 *     └── Company: ABC Abu Dhabi    (type = BRANCH, parentCompany = Head Office)
 */
@Entity
@Table(name = "companies", schema = "public")
@Getter
@Setter
public class Company extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;

    // HEAD_OFFICE or BRANCH — the core field that drives all access control decisions
    @Enumerated(EnumType.STRING)
    @Column(name = "company_type", nullable = false)
    private CompanyType companyType = CompanyType.HEAD_OFFICE;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CompanyStatus status = CompanyStatus.ACTIVE;

    // Maximum branches this Head Office can create (default 5, set by Prabha Tech)
    @Column(name = "branch_limit")
    private Integer branchLimit = 5;

    // Which Prabha Tech client organization owns this company
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    // For BRANCH type: points to the Head Office. Null for HEAD_OFFICE type.
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_company_id")
    private Company parentCompany;

    // Expose the parent ID directly so the frontend can determine hierarchy without lazy loading
    @Column(name = "parent_company_id", insertable = false, updatable = false)
    private Long parentCompanyId;

    /**
     * PostgreSQL schema name for this Head Office's tenant data.
     * Only populated for HEAD_OFFICE type companies.
     * Example: "yuwa_tech_solutions"
     */
    @Column(name = "schema_name", unique = true)
    private String schemaName;

    @JsonIgnore
    @OneToMany(mappedBy = "parentCompany", cascade = CascadeType.ALL)
    private List<Company> branches = new ArrayList<>();

    private String address;
    private String city;
    private String state;
    private String country;
    private String zip;
    private String phone;
    private String email;
    private String website;

    @Column(name = "logo_path")
    private String logoPath;

    @Column(name = "tax_id")
    private String taxId;

    @Column(name = "registration_number")
    private String registrationNumber;

    // Helper: is this the Head Office?
    public boolean isHeadOffice() {
        return CompanyType.HEAD_OFFICE.equals(this.companyType);
    }

    // Helper: is this a Branch?
    public boolean isBranch() {
        return CompanyType.BRANCH.equals(this.companyType);
    }

    public enum CompanyType {
        HEAD_OFFICE,
        BRANCH
    }

    public enum CompanyStatus {
        ACTIVE,
        INACTIVE,
        SUSPENDED
    }
}
