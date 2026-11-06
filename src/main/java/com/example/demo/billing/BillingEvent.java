package com.example.demo.billing;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
@Entity @Table(name="billing_events",schema="public") @Getter @Setter
public class BillingEvent {
    @Id @Column(name="id") private String id;
    @Column(name="organization_id") private Long organizationId;
    @Column(name="type") private String type;
    @Column(name="actor") private String actor;
    @Column(name="details",length=2048) private String details;
    @Column(name="payload_hash") private String payloadHash;
    @Column(name="processed_at") private Instant processedAt;
}
