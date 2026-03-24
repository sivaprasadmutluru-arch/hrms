package com.example.demo.auth.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Allows a Head Office admin to explicitly grant a user from one branch
 * read access to another branch's data.
 *
 * Example: A regional HR Manager at Branch A can be granted access to Branch B's data.
 */
@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Table(
    name = "cross_branch_access_grants",
    schema = "public",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "target_company_id"})
)
@Getter
@Setter
public class CrossBranchAccessGrant extends BaseEntity {

    // The user who is being granted access
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // The company whose data this user is allowed to view
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_company_id", nullable = false)
    private Company targetCompany;

    // The Head Office company that approved this grant
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "granted_by_company_id", nullable = false)
    private Company grantedByCompany;

    // Optional note explaining why access was granted
    @Column
    private String reason;
}
