package com.example.demo.carr.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity @Table(name="carr_responsibilities") @Getter @Setter
public class CarrResponsibility extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="carr_id", nullable=false) private CarrRecord carr;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="accountable_employee_id", nullable=false) private Employee accountableEmployee;
    @Column(nullable=false, length=500) private String statement;
    @Column(length=80) private String priority = "MEDIUM";
    @Column(length=80) private String frequency;
    @Column(name="evidence_required", columnDefinition="text") private String evidenceRequired;
    @Column(nullable=false) private int weight = 0;
    @Column(columnDefinition="text") private String description;
    @Column(name="due_date") private java.time.LocalDate dueDate;
    @Enumerated(EnumType.STRING) @Column(name="task_status", nullable=false, length=30)
    @org.hibernate.annotations.ColumnDefault("'TODO'")
    private TaskStatus taskStatus = TaskStatus.TODO;
    @org.hibernate.annotations.ColumnDefault("0")
    @Column(nullable=false) private int progress = 0;
    @Column(columnDefinition="text") private String instructions;
    @Column(name="required_deliverables", columnDefinition="text") private String requiredDeliverables;
    @org.hibernate.annotations.ColumnDefault("'[]'")
    @Column(name="checklist_items",nullable=false,columnDefinition="text") private String checklistItems="[]";
    @org.hibernate.annotations.ColumnDefault("false")
    @Column(name="requires_review", nullable=false) private boolean requiresReview;
    @org.hibernate.annotations.ColumnDefault("false")
    @Column(name="requires_evidence", nullable=false) private boolean requiresEvidence;
    @Column(name="assigned_by_user_id") private Long assignedByUserId;
    @Column(name="assigned_by_name", length=255) private String assignedByName;
    @Column(name="reviewer_user_id") private Long reviewerUserId;
    @Column(name="assigned_at") private java.time.LocalDateTime assignedAt;
    @Column(name="work_details", columnDefinition="text") private String workDetails;
    @Column(name="blocker_reason", columnDefinition="text") private String blockerReason;
    @Column(name="review_feedback", columnDefinition="text") private String reviewFeedback;
    @Column(name="actual_completion_date") private java.time.LocalDate actualCompletionDate;
    @Column(name="submitted_at") private java.time.LocalDateTime submittedAt;
    @Column(name="completed_at") private java.time.LocalDateTime completedAt;
    @Column(name="deadline_notice_date") private java.time.LocalDate deadlineNoticeDate;
    @Column(name="deadline_notice_kind", length=20) private String deadlineNoticeKind;
    @Version @org.hibernate.annotations.ColumnDefault("0")
    @Column(name="task_version", nullable=false) private long taskVersion;
    public enum TaskStatus { TODO, IN_PROGRESS, BLOCKED, READY_FOR_REVIEW, ON_HOLD, COMPLETED, CANCELLED }
}
