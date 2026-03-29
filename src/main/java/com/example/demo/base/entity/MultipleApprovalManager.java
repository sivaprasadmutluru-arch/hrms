package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "multiple_approval_managers")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MultipleApprovalManager extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "condition_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private MultipleApprovalCondition condition;

    @Column(name = "sequence", nullable = false)
    private Integer sequence;

    @Column(name = "employee_id")
    private Long employeeId;

    @Column(name = "reporting_manager", length = 100)
    private String reportingManager;
}
