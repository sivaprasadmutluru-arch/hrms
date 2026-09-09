package com.example.demo.carr.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity @Table(name="carr_responsibilities") @Getter @Setter
public class CarrResponsibility extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="carr_id", nullable=false) private CarrRecord carr;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="accountable_employee_id", nullable=false) private Employee accountableEmployee;
    @Column(nullable=false, length=500) private String statement;
    @Column(length=80) private String priority = "MEDIUM";
    @Column(length=80) private String frequency;
    @Column(name="evidence_required", columnDefinition="text") private String evidenceRequired;
    @Column(nullable=false) private int weight = 0;
}
