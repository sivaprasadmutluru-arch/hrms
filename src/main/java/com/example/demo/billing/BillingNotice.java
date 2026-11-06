package com.example.demo.billing;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
@Entity @Table(name="billing_notices",schema="public",uniqueConstraints=@UniqueConstraint(name="billing_notice_period_unique",columnNames={"organization_id","kind","period_end"}),indexes=@Index(name="billing_notice_org_idx",columnList="organization_id,created_at")) @Getter @Setter
public class BillingNotice {
 @Id private String id;
 @Column(name="organization_id",nullable=false) private Long organizationId;
 @Column(name="kind",nullable=false) private String kind;
 @Column(name="period_end",nullable=false) private Instant periodEnd;
 @Column(name="recipient") private String recipient;
 @Column(name="status",nullable=false) private String status;
 @Column(name="attempts",nullable=false) private int attempts;
 @Column(name="created_at",nullable=false) private Instant createdAt;
 @Column(name="sent_at") private Instant sentAt;
 @Column(name="next_attempt_at") private Instant nextAttemptAt;
 @Column(name="last_error") private String lastError;
}
