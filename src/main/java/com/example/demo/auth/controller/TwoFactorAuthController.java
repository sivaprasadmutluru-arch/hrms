package com.example.demo.auth.controller;

import com.example.demo.auth.entity.TwoFactorAuth;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.repository.TwoFactorAuthRepository;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Two-Factor Authentication (2FA) management.
 *
 * Flow:
 *   1. POST /api/2fa/setup   → generates an OTP, stores it with expiry, returns it (in prod: email it)
 *   2. POST /api/2fa/verify  → user submits the OTP to verify and enable 2FA
 *   3. POST /api/2fa/disable → user submits current OTP to disable 2FA
 *   4. POST /api/2fa/send-otp → re-send OTP (for login step-up)
 *   5. GET  /api/2fa/status  → check if 2FA is enabled for current user
 */
@RestController
@RequestMapping("/api/2fa")
@RequiredArgsConstructor
@Tag(name = "Two-Factor Authentication")
public class TwoFactorAuthController {

    private final TwoFactorAuthRepository twoFactorAuthRepository;
    private final UserRepository userRepository;

    private static final int OTP_EXPIRY_MINUTES = 10;

    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    @Operation(summary = "Get 2FA status for current user")
    public ResponseEntity<Map<String, Object>> getStatus(@AuthenticationPrincipal UserPrincipal principal) {
        TwoFactorAuth tfa = twoFactorAuthRepository.findByUserId(principal.getId())
                .orElse(null);
        boolean enabled = tfa != null && tfa.isEnabled();
        return ResponseEntity.ok(Map.of("twoFactorEnabled", enabled));
    }

    @PostMapping("/setup")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    @Operation(summary = "Initiate 2FA setup — generates and returns a 6-digit OTP (in production: sends via email)")
    public ResponseEntity<Map<String, Object>> setup(@AuthenticationPrincipal UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));

        TwoFactorAuth tfa = twoFactorAuthRepository.findByUserId(principal.getId())
                .orElseGet(() -> {
                    TwoFactorAuth t = new TwoFactorAuth();
                    t.setUser(user);
                    return t;
                });

        String otp = generateOtp();
        tfa.setOtpCode(otp);
        tfa.setOtpExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        tfa.setOtpVerified(false);
        twoFactorAuthRepository.save(tfa);

        // In production, email the OTP — here we return it for testing
        return ResponseEntity.ok(Map.of(
                "message", "OTP generated. In production this would be emailed.",
                "otp", otp,
                "expiresInMinutes", OTP_EXPIRY_MINUTES
        ));
    }

    @PostMapping("/send-otp")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    @Operation(summary = "Re-send OTP (for login step-up verification)")
    public ResponseEntity<Map<String, Object>> sendOtp(@AuthenticationPrincipal UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));

        TwoFactorAuth tfa = twoFactorAuthRepository.findByUserId(principal.getId())
                .orElseGet(() -> {
                    TwoFactorAuth t = new TwoFactorAuth();
                    t.setUser(user);
                    return t;
                });

        String otp = generateOtp();
        tfa.setOtpCode(otp);
        tfa.setOtpExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        twoFactorAuthRepository.save(tfa);

        return ResponseEntity.ok(Map.of(
                "message", "OTP sent.",
                "otp", otp,
                "expiresInMinutes", OTP_EXPIRY_MINUTES
        ));
    }

    @PostMapping("/verify")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    @Operation(summary = "Verify OTP and enable 2FA")
    public ResponseEntity<Map<String, String>> verify(@AuthenticationPrincipal UserPrincipal principal,
                                                       @RequestBody Map<String, String> body) {
        String submittedOtp = body.get("otp");
        TwoFactorAuth tfa = twoFactorAuthRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new BadRequestException("No 2FA setup found. Call /api/2fa/setup first."));

        if (tfa.getOtpExpiresAt() == null || LocalDateTime.now().isAfter(tfa.getOtpExpiresAt())) {
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }
        if (!tfa.getOtpCode().equals(submittedOtp)) {
            throw new BadRequestException("Invalid OTP.");
        }

        tfa.setEnabled(true);
        tfa.setOtpVerified(true);
        tfa.setOtpCode(null);
        tfa.setOtpExpiresAt(null);
        twoFactorAuthRepository.save(tfa);

        return ResponseEntity.ok(Map.of("message", "2FA enabled successfully."));
    }

    @PostMapping("/disable")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    @Operation(summary = "Disable 2FA for current user (requires OTP confirmation)")
    public ResponseEntity<Map<String, String>> disable(@AuthenticationPrincipal UserPrincipal principal,
                                                        @RequestBody Map<String, String> body) {
        String submittedOtp = body.get("otp");
        TwoFactorAuth tfa = twoFactorAuthRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new BadRequestException("2FA is not set up for this account."));

        if (!tfa.isEnabled()) {
            throw new BadRequestException("2FA is not currently enabled.");
        }
        if (submittedOtp == null || submittedOtp.isBlank()) {
            throw new BadRequestException("OTP is required to disable 2FA.");
        }
        if (tfa.getOtpExpiresAt() == null || LocalDateTime.now().isAfter(tfa.getOtpExpiresAt())) {
            throw new BadRequestException("OTP has expired. Please request a new one via /api/2fa/send-otp.");
        }
        if (!tfa.getOtpCode().equals(submittedOtp)) {
            throw new BadRequestException("Invalid OTP.");
        }

        tfa.setEnabled(false);
        tfa.setOtpCode(null);
        tfa.setOtpExpiresAt(null);
        tfa.setOtpVerified(false);
        twoFactorAuthRepository.save(tfa);

        return ResponseEntity.ok(Map.of("message", "2FA disabled."));
    }

    // ─── Admin endpoints ─────────────────────────────────────────────────────

    @GetMapping("/admin/user/{userId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Admin: Get 2FA status for any user")
    public ResponseEntity<Map<String, Object>> adminGetStatus(@PathVariable Long userId) {
        TwoFactorAuth tfa = twoFactorAuthRepository.findByUserId(userId).orElse(null);
        boolean enabled = tfa != null && tfa.isEnabled();
        return ResponseEntity.ok(Map.of("userId", userId, "twoFactorEnabled", enabled));
    }

    @PostMapping("/admin/user/{userId}/disable")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Transactional
    @Operation(summary = "Admin: Force-disable 2FA for a user (e.g. account recovery)")
    public ResponseEntity<Map<String, String>> adminDisable(@PathVariable Long userId) {
        TwoFactorAuth tfa = twoFactorAuthRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("2FA not set up for user " + userId));
        tfa.setEnabled(false);
        tfa.setOtpCode(null);
        tfa.setOtpExpiresAt(null);
        twoFactorAuthRepository.save(tfa);
        return ResponseEntity.ok(Map.of("message", "2FA force-disabled for user " + userId));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }
}
