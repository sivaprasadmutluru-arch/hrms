package com.example.demo.attendance.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
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
        PENDING,            // submitted, awaiting admin/HR manager approval
        APPROVED,           // approved — attendance updated, notification sent
        REJECTED            // rejected
    }

    // ─── Core Fields ──────────────────────────────────────────────────────────

    /** The attendance record this request relates to. Null when requesting regularisation for a
     *  day with no attendance row yet (e.g. currently shown as Absent / On Leave / Holiday / Week Off) —
     *  see {@link #requestDate} for the date in that case. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id")
    private Attendance attendance;

    /** Calendar date being regularised when {@link #attendance} is null. Approval creates the
     *  Attendance record for this date. */
    @Column(name = "request_date")
    private LocalDate requestDate;

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
    private RequestStatus status = RequestStatus.PENDING;

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

    // ─── Manager Approval (legacy) ────────────────────────────────────────────
    // Retained for audit history on requests created before the single-stage
    // approval redesign. No longer set for new requests.

    /** The reporting manager who needed to approve this request under the old workflow. */
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

    // ─── Approval ─────────────────────────────────────────────────────────────
    // These columns are named hr_* for historical reasons but now represent the
    // single admin/HR-manager approver under the simplified workflow.

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
}
