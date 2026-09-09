package com.example.demo.carr.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity @Table(name="carr_audit_events") @Getter @Setter
public class CarrAuditEvent extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="carr_id", nullable=false) private CarrRecord carr;
    @Column(nullable=false, length=60) private String action;
    @Column(name="actor_user_id", nullable=false) private Long actorUserId;
    @Column(name="actor_email", length=320) private String actorEmail;
    @Column(columnDefinition="text") private String details;
}
