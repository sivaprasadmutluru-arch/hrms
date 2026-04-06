package com.example.demo.auth.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Fine-grained per-user permission overrides.
 * Allows granting or revoking specific permission codes for individual users,
 * independent of their role-based permissions.
 *
 * Example: grant "payroll:edit" to a specific HR_MANAGER who doesn't normally have it.
 * Example: revoke "employee:delete" from a BRANCH_ADMIN for a sensitive period.
 */
@Entity
@Table(name = "user_permission_overrides", schema = "public",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "permission_code"}))
@Getter
@Setter
public class UserPermissionOverride extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * The permission code, e.g. "employee:view", "payroll:edit", "leave:approve"
     */
    @Column(name = "permission_code", nullable = false, length = 100)
    private String permissionCode;

    /**
     * true = explicitly GRANTED (adds the permission even if role doesn't have it)
     * false = explicitly REVOKED (removes the permission even if role grants it)
     */
    @Column(name = "is_granted", nullable = false)
    private boolean isGranted = true;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;
}
