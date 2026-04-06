package com.example.demo.payroll.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "payroll_encashment_conditions")
@Getter
@Setter
public class EncashmentCondition extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "max_encashable_days")
    private Integer maxEncashableDays;

    @Column(name = "eligible_leave_types", columnDefinition = "TEXT")
    private String eligibleLeaveTypes; // JSON array of leave type IDs

    @Column(name = "is_eligible")
    private Boolean isEligible = true;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
