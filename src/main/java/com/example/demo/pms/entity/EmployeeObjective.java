package com.example.demo.pms.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "employee_objectives",
        uniqueConstraints = @UniqueConstraint(columnNames = {"employee_id", "objective_id"}))
@Getter
@Setter
public class EmployeeObjective extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "objective_id", nullable = false)
    private Objective objective;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private Objective.ObjectiveStatus status = Objective.ObjectiveStatus.NOT_STARTED;
}
