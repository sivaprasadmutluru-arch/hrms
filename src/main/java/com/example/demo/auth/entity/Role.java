package com.example.demo.auth.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "roles", schema = "public")
@Getter
@Setter
public class Role extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true)
    private RoleName name;

    @Column(name = "display_name")
    private String displayName;

    @Column
    private String description;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "role_permissions",
        schema = "public",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();

    public enum RoleName {
        // Canonical production roles. Legacy roles below remain during migration.
        SUPER_ADMIN,
        ACCOUNT_MANAGER,
        COMPANY_ADMIN,
        COMPANY_MANAGER,
        DEPARTMENT_MANAGER,
        HR_MANAGER,
        ACCOUNTS_MANAGER,
        EMPLOYEE,

        // Prabha Tech internal — manages all client organizations on the platform
        PLATFORM_SUPER_ADMIN,

        // Head Office level — full access to Head Office + all its branches
        ENTERPRISE_ADMIN,

        // Branch level — manages one specific branch only
        BRANCH_ADMIN,

        // Finance/Payroll — can be at Head Office level (all branches) or Branch level (one branch)
        ACCOUNTANT,

        // Team lead within a department — limited approvals and team visibility
        TEAM_LEAD,

        // TEAM_LEAD is migrated to DEPARTMENT_MANAGER with its existing narrow scope.
        // These identifiers are retained so existing assignments continue working.
    }
}
