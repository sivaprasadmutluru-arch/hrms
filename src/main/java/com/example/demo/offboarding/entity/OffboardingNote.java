package com.example.demo.offboarding.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "offboarding_notes")
@Getter
@Setter
public class OffboardingNote extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_offboarding_id", nullable = false)
    private EmployeeOffboarding employeeOffboarding;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private Employee createdBy;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String note;
}
