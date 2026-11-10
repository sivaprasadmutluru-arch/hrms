package com.example.demo.platformops;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
@Entity @Table(name="platform_support_tickets",schema="public",indexes={@Index(name="platform_support_org_idx",columnList="organization_id,updated_at"),@Index(name="platform_support_queue_idx",columnList="updated_at"),@Index(name="platform_support_status_idx",columnList="status,updated_at")}) @Getter @Setter
public class PlatformSupportTicket {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Version private long version;
 @Column(name="organization_id",nullable=false) private Long organizationId;
 @Column(name="organization_name",nullable=false) private String organizationName;
 @Column(name="subject",nullable=false,length=200) private String subject;
 @Column(name="category",nullable=false) private String category;
 @Column(name="priority",nullable=false) private String priority;
 @Column(name="status",nullable=false) private String status;
 @Column(name="created_by",nullable=false) private String createdBy;
 @Column(name="assigned_to") private String assignedTo;
 @Column(name="created_at",nullable=false) private Instant createdAt;
 @Column(name="updated_at",nullable=false) private Instant updatedAt;
 @Column(name="first_response_at") private Instant firstResponseAt;
 @Column(name="resolved_at") private Instant resolvedAt;
}
