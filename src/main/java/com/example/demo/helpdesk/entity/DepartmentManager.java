package com.example.demo.helpdesk.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Department;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "helpdesk_department_managers",
        uniqueConstraints = @UniqueConstraint(columnNames = {"department_id", "manager_id"}))
@Getter
@Setter
public class DepartmentManager extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "manager_id", nullable = false)
    private Employee manager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
