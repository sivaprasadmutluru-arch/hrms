package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Manager/Admin-initiated shift allocation.
 *
 * Distinct from ShiftRequest (employee requesting a shift change):
 * here a manager/admin allocates a specific shift to an employee,
 * optionally requiring the employee to confirm.
 */
@Entity
@Table(name = "shift_allocation_requests")
@Getter
@Setter
public class ShiftAllocationRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "allocated_shift_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ShiftSchedule allocatedShift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_shift_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ShiftSchedule previousShift;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private AllocationStatus status = AllocationStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocated_by_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Employee allocatedBy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    public enum AllocationStatus {
        PENDING, APPROVED, REJECTED, CANCELLED
    }
}
