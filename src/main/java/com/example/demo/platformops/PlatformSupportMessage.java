package com.example.demo.platformops;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
@Entity @Table(name="platform_support_messages",schema="public",indexes=@Index(name="platform_support_message_idx",columnList="ticket_id,id")) @Getter @Setter
public class PlatformSupportMessage {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="ticket_id",nullable=false) private Long ticketId;
 @Column(name="author",nullable=false) private String author;
 @Column(name="platform_reply",nullable=false) private boolean platformReply;
 @Column(name="kind",nullable=false) private String kind;
 @Column(name="body",nullable=false,length=6000) private String body;
 @Column(name="created_at",nullable=false) private Instant createdAt;
}
