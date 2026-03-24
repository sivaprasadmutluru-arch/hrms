package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "work_type_requests")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class WorkTypeRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_work_type_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WorkType requestedWorkType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_work_type_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WorkType previousWorkType;

    @Column(name = "requested_date")
    private LocalDate requestedDate;

    @Column(name = "requested_till")
    private LocalDate requestedTill;

    @Column(name = "is_permanent")
    private Boolean isPermanent = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private WorkTypeRequestStatus status = WorkTypeRequestStatus.REQUESTED;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    public enum WorkTypeRequestStatus {
        REQUESTED, APPROVED, REJECTED, CANCELLED
    }
}
