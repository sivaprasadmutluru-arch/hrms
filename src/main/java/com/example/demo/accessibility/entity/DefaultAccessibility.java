package com.example.demo.accessibility.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "default_accessibility")
@Getter
@Setter
public class DefaultAccessibility extends BaseEntity {

    @Column(name = "feature", length = 100)
    private String feature;

    @Column(name = "filter", columnDefinition = "TEXT")
    private String filter;

    @Column(name = "exclude_all")
    private boolean excludeAll = false;

    @Column(name = "is_enabled")
    private boolean enabled = true;

    @ManyToMany
    @JoinTable(
            name = "accessibility_employees",
            joinColumns = @JoinColumn(name = "accessibility_id"),
            inverseJoinColumns = @JoinColumn(name = "employee_id")
    )
    private List<Employee> employees = new ArrayList<>();
}
