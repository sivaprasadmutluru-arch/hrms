package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rotating_work_types")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class RotatingWorkType extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_type1_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WorkType workType1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_type2_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WorkType workType2;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "rotating_work_type_employees",
        joinColumns = @JoinColumn(name = "rotating_work_type_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private List<Employee> employees = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
