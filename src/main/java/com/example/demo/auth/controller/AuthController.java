package com.example.demo.auth.controller;

import com.example.demo.auth.dto.LoginRequest;
import com.example.demo.auth.dto.LoginResponse;
import com.example.demo.auth.dto.PasswordResetRequest;
import com.example.demo.auth.dto.RegisterRequest;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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
    private final EmployeeRepository employeeRepository;

    @GetMapping("/me")
    @Operation(summary = "Get current user info and roles")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal UserPrincipal principal) {
        List<String> roles = principal.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5))
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        Long companyId = userRoleRepository.findByUserId(principal.getId()).stream()
                .filter(ur -> ur.getCompany() != null)
                .max(java.util.Comparator.comparingInt(ur ->
                        ur.getAccessScope() != null ? ur.getAccessScope().ordinal() : -1))
                .map(ur -> ur.getCompany().getId())
                .orElse(null);

        // Use HashMap instead of Map.of() to support null values
        Map<String, Object> response = new HashMap<>();
        Long employeeId = employeeRepository.findByUserId(principal.getId())
                .map(e -> e.getId())
                .orElse(null);

        response.put("userId", principal.getId());
        response.put("username", principal.getUsername());
        response.put("email", principal.getEmail());
        response.put("roles", roles);
        response.put("companyId", companyId);
        response.put("employeeId", employeeId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Login and get JWT token")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
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
}
