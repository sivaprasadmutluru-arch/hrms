package com.example.demo.auth.dto;

import com.example.demo.auth.entity.UserRole;
import lombok.Getter;
import lombok.Setter;

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
        return dto;
    }
}
