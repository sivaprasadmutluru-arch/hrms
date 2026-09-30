package com.example.demo.auth.controller;

import com.example.demo.auth.dto.LoginRequest;
import com.example.demo.auth.dto.LoginResponse;
import com.example.demo.auth.dto.PasswordResetRequest;
import com.example.demo.auth.dto.PasswordResetConfirmRequest;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService authService;
    private final com.example.demo.auth.service.EmployeeCompanyGuard employeeCompanyGuard;
    private final UserRoleRepository userRoleRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final com.example.demo.auth.repository.UserRepository userRepository;

    @GetMapping("/me")
    @Transactional
    @Operation(summary = "Get current user info and roles")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        List<String> roles = principal.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5))
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        UserRole primaryRole = employeeCompanyGuard.primaryRole(principal.getId());

        Long rawCompanyId = primaryRole != null ? primaryRole.getCompany().getId() : null;
        // For ENTERPRISE scope, ensure we return the head office ID.
        // If the role was assigned to a branch, walk up to its parent head office.
        Long companyId;
        if (rawCompanyId != null && primaryRole.getAccessScope() == UserRole.AccessScope.ENTERPRISE) {
            com.example.demo.base.entity.Company roleCompany = companyRepository.findById(rawCompanyId).orElse(null);
            if (roleCompany != null && roleCompany.isBranch() && roleCompany.getParentCompany() != null) {
                companyId = roleCompany.getParentCompany().getId();
            } else {
                companyId = rawCompanyId;
            }
        } else {
            companyId = rawCompanyId;
        }
        Long organizationId = companyId != null
                ? companyRepository.findById(companyId)
                        .map(c -> c.getOrganization() != null ? c.getOrganization().getId() : null)
                        .orElse(null)
                : null;
        String companyName = companyId != null
                ? companyRepository.findById(companyId).map(c -> c.getName()).orElse(null)
                : null;
        String companyLogoUrl = companyId != null
                ? companyRepository.findById(companyId)
                        .map(c -> c.getLogoPath() != null ? "/api/files/" + c.getLogoPath() : null)
                        .orElse(null)
                : null;

        // Report the employee profile linked to this user in the current tenant schema, if any.
        // Does NOT auto-create one: employeeRepository is schema-scoped to whichever company is
        // currently active, so a user with a real profile in a different company (e.g. a platform
        // admin viewing another client org) would otherwise look "profile-less" here and get a
        // second, broken placeholder record silently created in the wrong schema.
        Optional<Employee> empOpt = employeeRepository.findByUserId(principal.getId());
        Long employeeId = empOpt.map(Employee::getId).orElse(null);
        String firstName = empOpt.map(Employee::getFirstName).orElse(null);
        String photoPath = empOpt.map(Employee::getPhotoPath).orElse(null);

        Map<String, Object> response = new HashMap<>();
        response.put("userId", principal.getId());
        response.put("username", principal.getUsername());
        response.put("email", principal.getEmail());
        response.put("roles", roles);
        response.put("companyId", companyId);
        response.put("companyName", companyName);
        response.put("companyLogoUrl", companyLogoUrl);
        response.put("organizationId", organizationId);
        response.put("employeeId", employeeId);
        response.put("firstName", firstName);
        response.put("photoPath", photoPath);
        response.put("mustChangePassword", userRepository.findById(principal.getId())
                .map(com.example.demo.auth.entity.User::isMustChangePassword)
                .orElse(false));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Login and get JWT token")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset email")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody PasswordResetRequest request) {
        authService.requestPasswordReset(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "Password reset email sent"));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using token")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody PasswordResetConfirmRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    @PostMapping("/change-username")
    @Operation(summary = "Change username for the current user")
    public ResponseEntity<Map<String, String>> changeUsername(@AuthenticationPrincipal UserPrincipal user,
                                                              @RequestBody Map<String, String> body) {
        authService.changeUsername(user.getId(), body.get("newUsername"));
        return ResponseEntity.ok(Map.of("message", "Username updated successfully"));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change password for the current user")
    public ResponseEntity<Map<String, String>> changePassword(@AuthenticationPrincipal UserPrincipal user,
                                                              @RequestBody Map<String, String> body) {
        authService.changePassword(user.getId(), body.get("currentPassword"), body.get("newPassword"));
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    @PostMapping("/admin/reset-password/{userId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Admin reset a user's password")
    public ResponseEntity<Map<String, String>> adminResetPassword(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body) {
        authService.adminResetPassword(userId, body.get("newPassword"));
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }
}
