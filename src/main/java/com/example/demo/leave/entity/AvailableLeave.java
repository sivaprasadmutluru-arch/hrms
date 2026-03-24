package com.example.demo.leave.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "available_leaves", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"employee_id", "leave_type_id"})
})
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AvailableLeave extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @Column(name = "available_days")
    private Double availableDays = 0.0;

    @Column(name = "carryforward_days")
    private Double carryforwardDays = 0.0;

    @Column(name = "total_leave_days")
    private Double totalLeaveDays = 0.0;

    @Column(name = "assigned_date")
    private LocalDate assignedDate;

    @Column(name = "reset_date")
    private LocalDate resetDate;

    @Column(name = "expired_date")
    private LocalDate expiredDate;
}
