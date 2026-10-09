package com.example.demo.auth.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users", schema = "public")
@Getter
@Setter
public class User extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "is_superuser")
    private boolean isSuperuser = false;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "must_change_password", nullable = false, columnDefinition = "boolean default false")
    private boolean mustChangePassword = false;

    /** Persistent per-user state for the optional product Quick Start Tour. */
    @Column(name = "quick_start_tour_completed", nullable = false, columnDefinition = "boolean default false")
    private boolean quickStartTourCompleted = false;

    /** Configurable company-assignment ceiling for Account Managers. */
    @Column(name = "account_manager_company_limit", nullable = false, columnDefinition = "integer default 6")
    private int accountManagerCompanyLimit = 6;

    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserRole> userRoles = new ArrayList<>();
}
