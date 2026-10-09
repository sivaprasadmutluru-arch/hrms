package com.example.demo.common.tenant;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** Durable, public-schema work record for new tenant setup. */
@Entity
@Table(name = "tenant_provisioning_jobs", schema = "public")
@Getter
@Setter
public class TenantProvisioningJob extends BaseEntity {

    public enum Status { PENDING, RUNNING, READY, FAILED }

    @ManyToOne(optional = false)
    @JoinColumn(name = "company_id", nullable = false, unique = true)
    private Company company;

    /** Public user ID only — never persist the administrator's plaintext password. */
    @Column(name = "initial_admin_user_id")
    private Long initialAdminUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.PENDING;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(name = "last_error", length = 4000)
    private String lastError;

    @Column(name = "lease_expires_at")
    private LocalDateTime leaseExpiresAt;

    @Column(name = "next_attempt_at")
    private LocalDateTime nextAttemptAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
