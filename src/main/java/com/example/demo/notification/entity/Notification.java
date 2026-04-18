package com.example.demo.notification.entity;

import com.example.demo.auth.entity.User;
import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "notifications")
@Getter
@Setter
public class Notification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type")
    private NotificationType notificationType;

    @Column(name = "related_entity")
    private String relatedEntity;

    @Column(name = "related_id")
    private Long relatedId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    public enum NotificationType {
        LEAVE_REQUEST, LEAVE_APPROVED, LEAVE_REJECTED,
        ATTENDANCE_REQUEST, ATTENDANCE_APPROVED,
        PAYSLIP_GENERATED, ASSET_ASSIGNED,
        TICKET_ASSIGNED, TICKET_RESOLVED,
        POLICY_PUBLISHED,
        GENERAL
    }
}
