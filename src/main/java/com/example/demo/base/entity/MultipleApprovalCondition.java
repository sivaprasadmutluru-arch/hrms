package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "multiple_approval_conditions")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MultipleApprovalCondition extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Department department;

    @Column(name = "condition_field", length = 255)
    private String conditionField;

    @Column(name = "condition_operator", length = 255)
    private String conditionOperator;

    @Column(name = "condition_value", length = 100)
    private String conditionValue;

    @Column(name = "condition_start_value", length = 100)
    private String conditionStartValue;

    @Column(name = "condition_end_value", length = 100)
    private String conditionEndValue;
}
