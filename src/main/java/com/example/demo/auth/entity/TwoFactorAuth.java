package com.example.demo.auth.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "two_factor_auth", schema = "public")
@Getter
@Setter
public class TwoFactorAuth extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "is_enabled")
    private boolean isEnabled = false;

    /** TOTP secret key (base32-encoded) for Google Authenticator / Authy */
    @Column(name = "totp_secret", length = 100)
    private String totpSecret;

    /** 6-digit OTP for email-based 2FA (fallback) */
    @Column(name = "otp_code", length = 10)
    private String otpCode;

    @Column(name = "otp_expires_at")
    private LocalDateTime otpExpiresAt;

    @Column(name = "otp_verified")
    private boolean otpVerified = false;
}
