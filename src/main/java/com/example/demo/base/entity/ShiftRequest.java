package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "shift_requests")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class ShiftRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_shift_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ShiftSchedule requestedShift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_shift_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ShiftSchedule previousShift;

    @Column(name = "requested_date")
    private LocalDate requestedDate;

    @Column(name = "requested_till")
    private LocalDate requestedTill;

    @Column(name = "is_permanent")
    private Boolean isPermanent = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ShiftRequestStatus status = ShiftRequestStatus.REQUESTED;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(name = "shift_changed")
    private Boolean shiftChanged = false;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reallocate_to_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Employee reallocateTo;

    @Column(name = "reallocate_approved")
    private Boolean reallocateApproved = false;

    @Column(name = "reallocate_canceled")
    private Boolean reallocateCanceled = false;

    public enum ShiftRequestStatus {
        REQUESTED, APPROVED, REJECTED, CANCELLED
    }
}
