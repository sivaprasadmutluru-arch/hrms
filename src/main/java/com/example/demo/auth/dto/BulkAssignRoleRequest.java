package com.example.demo.auth.dto;

import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.UserRole;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class BulkAssignRoleRequest {
    @NotNull private Long userId;
    @NotNull private Role.RoleName roleName;
    @NotEmpty private List<Long> companyIds;
    @NotNull private UserRole.AccessScope accessScope;
    private UserRole.AccessLevel accessLevel = UserRole.AccessLevel.FULL;
    private LocalDate effectiveFrom;
    private LocalDate expiresOn;
    private String reason;

    public AssignRoleRequest forCompany(Long companyId) {
        AssignRoleRequest request = new AssignRoleRequest();
        request.setUserId(userId);
        request.setRoleName(roleName);
        request.setCompanyId(companyId);
        request.setAccessScope(accessScope);
        request.setAccessLevel(accessLevel);
        request.setEffectiveFrom(effectiveFrom);
        request.setExpiresOn(expiresOn);
        request.setReason(reason);
        return request;
    }
}
