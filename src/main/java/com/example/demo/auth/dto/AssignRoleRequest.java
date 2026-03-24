package com.example.demo.auth.dto;

import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.UserRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Used by admins to assign a role to a user within a company.
 *
 * Example: Assign BRANCH_ADMIN role to user 5 at company 3 (Branch Dubai) with BRANCH scope.
 *   userId = 5
 *   roleName = BRANCH_ADMIN
 *   companyId = 3
 *   accessScope = BRANCH
 */
@Getter
@Setter
public class AssignRoleRequest {

    @NotNull
    private Long userId;

    @NotNull
    private Role.RoleName roleName;

    @NotNull
    private Long companyId;

    @NotNull
    private UserRole.AccessScope accessScope;
}
