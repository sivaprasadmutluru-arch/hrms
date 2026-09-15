package com.example.demo.auth.dto;

import com.example.demo.auth.entity.UserRole;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Getter
@Setter
public class UserRoleDto {

    private Long id;

    private Long userId;
    private String username;
    private String email;

    private Long roleId;
    private String roleName;

    private Long companyId;
    private String companyName;

    private UserRole.AccessScope accessScope;
    private UserRole.AccessLevel accessLevel;
    private Long departmentId;
    private Long teamId;
    private Long employeeScopeId;
    private LocalDate effectiveFrom;
    private LocalDate expiresOn;
    private UserRole.AssignmentStatus assignmentStatus;
    private Long grantedByUserId;
    private String reason;
    private String scopeSummary;

    public static UserRoleDto from(UserRole ur) {
        UserRoleDto dto = new UserRoleDto();
        dto.setId(ur.getId());
        if (ur.getUser() != null) {
            dto.setUserId(ur.getUser().getId());
            dto.setUsername(ur.getUser().getUsername());
            dto.setEmail(ur.getUser().getEmail());
        }
        if (ur.getRole() != null) {
            dto.setRoleId(ur.getRole().getId());
            dto.setRoleName(ur.getRole().getName().name());
        }
        if (ur.getCompany() != null) {
            dto.setCompanyId(ur.getCompany().getId());
            dto.setCompanyName(ur.getCompany().getName());
        }
        dto.setAccessScope(ur.getAccessScope());
        dto.setAccessLevel(ur.getAccessLevel());
        dto.setDepartmentId(ur.getDepartmentId());
        dto.setTeamId(ur.getTeamId());
        dto.setEmployeeScopeId(ur.getEmployeeScopeId());
        dto.setEffectiveFrom(ur.getEffectiveFrom());
        dto.setExpiresOn(ur.getExpiresOn());
        dto.setAssignmentStatus(ur.getAssignmentStatus());
        dto.setGrantedByUserId(ur.getGrantedByUserId());
        dto.setReason(ur.getAssignmentReason());
        dto.setScopeSummary(ur.getRole() != null && ur.getRole().getName() == com.example.demo.auth.entity.Role.RoleName.ACCOUNT_MANAGER
                ? (ur.getAccessLevel() == UserRole.AccessLevel.PARTIAL
                    ? "Company access (Payroll excluded)" : "Full company access")
                : ur.getAccessScope() != null ? ur.getAccessScope().name().replace('_', ' ') : "No scope");
        return dto;
    }
}
