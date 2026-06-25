package com.example.demo.attendance.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "attendance_regularisation_requests", indexes = {
        @Index(name = "idx_reg_req_employee",  columnList = "employee_id"),
        @Index(name = "idx_reg_req_attendance", columnList = "attendance_id"),
        @Index(name = "idx_reg_req_status",    columnList = "status"),
        @Index(name = "idx_reg_req_manager",   columnList = "manager_id, status")
})
@Getter
@Setter
public class AttendanceRegularisationRequest extends BaseEntity {

    // ─── Enums ────────────────────────────────────────────────────────────────

    public enum RequestType {
        LATE_ARRIVAL,             // explain being late — clears deduction
        MISSING_PUNCH,            // supply missing check-in or check-out
        WORKING_HOURS_CORRECTION, // fix wrong system-calculated hours
        OVERTIME_REQUEST,         // claim OT hours (overrides auto-calculated)
        WRONG_STATUS,             // attendance flagged incorrectly
        HALF_TO_FULL_DAY,         // upgrade half-day to full-day
        WORK_FROM_HOME,           // mark WFH work type
        OFFICIAL_DUTY             // client visit / field work
    }

    public enum RequestStatus {
        PENDING_MANAGER,    // submitted, awaiting reporting manager
        APPROVED_BY_MANAGER, // manager approved, auto-moved to PENDING_HR
        PENDING_HR,         // awaiting HR verification
        APPROVED,           // fully approved — attendance updated, notification sent
        REJECTED            // rejected at manager or HR stage
    }

    public enum RejectionStage {
        MANAGER, HR
    }

    // ─── Core Fields ──────────────────────────────────────────────────────────

    /** The attendance record this request relates to. Nullable for date-only OT requests. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id")
    private Attendance attendance;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 30)
    private RequestType requestType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 25)
    private RequestStatus status = RequestStatus.PENDING_MANAGER;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "attachment_url")
    private String attachmentUrl;

    // ─── Requested Corrections ────────────────────────────────────────────────

    /** Requested check-in time (MISSING_PUNCH / WORKING_HOURS_CORRECTION). */
    @Column(name = "requested_check_in")
    private LocalTime requestedCheckIn;

    /** Requested check-out time (MISSING_PUNCH / WORKING_HOURS_CORRECTION). */
    @Column(name = "requested_check_out")
    private LocalTime requestedCheckOut;

    /** Requested overtime hours (OVERTIME_REQUEST). */
    @Column(name = "requested_overtime_hours")
    private Double requestedOvertimeHours;

    // ─── Manager Approval ─────────────────────────────────────────────────────

    /** The reporting manager who needs to approve this request. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private Employee manager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_approved_by")
    private Employee managerApprovedBy;

    @Column(name = "manager_approved_at")
    private LocalDateTime managerApprovedAt;

    @Column(name = "manager_remarks", columnDefinition = "TEXT")
    private String managerRemarks;

    // ─── HR Approval ──────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_approved_by")
    private Employee hrApprovedBy;

    @Column(name = "hr_approved_at")
    private LocalDateTime hrApprovedAt;

    @Column(name = "hr_remarks", columnDefinition = "TEXT")
    private String hrRemarks;

    // ─── Rejection ────────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rejected_by")
    private Employee rejectedBy;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_remarks", columnDefinition = "TEXT")
    private String rejectionRemarks;

    @Enumerated(EnumType.STRING)
    @Column(name = "rejection_stage", length = 10)
    private RejectionStage rejectionStage;
}
