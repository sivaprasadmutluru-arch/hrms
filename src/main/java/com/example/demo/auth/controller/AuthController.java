package com.example.demo.auth.controller;

import com.example.demo.auth.dto.LoginRequest;
import com.example.demo.auth.dto.LoginResponse;
import com.example.demo.auth.dto.PasswordResetRequest;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.UserRepository;
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

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService authService;
    private final UserRoleRepository userRoleRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;

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

        UserRole primaryRole = userRoleRepository.findByUserId(principal.getId()).stream()
                .filter(ur -> ur.getCompany() != null)
                .max(java.util.Comparator.comparingInt(ur ->
                        ur.getAccessScope() != null ? ur.getAccessScope().ordinal() : -1))
                .orElse(null);

        Long companyId = primaryRole != null ? primaryRole.getCompany().getId() : null;
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

        // Auto-create an employee profile for admin users who don't have one yet
        Long employeeId = employeeRepository.findByUserId(principal.getId())
                .map(Employee::getId)
                .orElseGet(() -> {
                    if (companyId == null) return null;
                    return companyRepository.findById(companyId).map(company -> {
                        return userRepository.findById(principal.getId()).map(user -> {
                            Employee emp = new Employee();
                            emp.setFirstName(principal.getUsername());
                            emp.setWorkEmail(principal.getEmail() != null ? principal.getEmail() : principal.getUsername());
                            emp.setCompany(company);
                            emp.setUser(user);
                            emp.setDateJoining(LocalDate.now());
                            return employeeRepository.save(emp).getId();
                        }).orElse(null);
                    }).orElse(null);
                });

        // Fetch employee's firstName for display
        String firstName = employeeRepository.findByUserId(principal.getId())
                .map(Employee::getFirstName)
                .orElse(null);

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
        authService.generatePasswordResetToken(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "Password reset email sent"));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using token")
    public ResponseEntity<Map<String, String>> resetPassword(
            @RequestParam String token,
            @RequestParam String newPassword) {
        authService.resetPassword(token, newPassword);
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
