package com.example.demo.pms.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "employee_key_results")
@Getter
@Setter
public class EmployeeKeyResult extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "key_result_id", nullable = false)
    private KeyResult keyResult;

    @Column(name = "current_value")
    private Double currentValue = 0.0;

    @Column(name = "progress")
    private Integer progress = 0;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
