package com.example.demo.leave.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "leave_allocation_requests")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class LeaveAllocationRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @Column(name = "requested_days", nullable = false)
    private Double requestedDays;

    @Column(name = "requested_date")
    private LocalDate requestedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private AllocationStatus status = AllocationStatus.REQUESTED;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "attachment_path")
    private String attachmentPath;

    /** The business operation represented by this immutable request. */
    @Enumerated(EnumType.STRING)
    @Column(name = "allocation_action", nullable = false)
    private AllocationAction allocationAction = AllocationAction.GRANT;

    /** The approved allocation that an amendment or cancellation supersedes. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_request_id")
    private LeaveAllocationRequest sourceRequest;

    /** Days actually credited when this request was approved (zero for a cancellation). */
    @Column(name = "applied_days")
    private Double appliedDays;

    @Enumerated(EnumType.STRING)
    @Column(name = "lifecycle_status", nullable = false)
    private LifecycleStatus lifecycleStatus = LifecycleStatus.ACTIVE;

    public enum AllocationStatus {
        REQUESTED, APPROVED, REJECTED, CANCELLED
    }

    public enum AllocationAction { GRANT, AMEND, CANCEL }

    /** An approved allocation is never deleted; it is superseded or cancelled instead. */
    public enum LifecycleStatus { ACTIVE, SUPERSEDED, CANCELLED }
}
