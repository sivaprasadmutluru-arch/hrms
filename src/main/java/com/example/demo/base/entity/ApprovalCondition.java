package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "approval_conditions")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ApprovalCondition extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_field")
    private ConditionField conditionField;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_operator")
    private ConditionOperator conditionOperator;

    @Column(name = "condition_value")
    private String conditionValue;

    @Column(name = "condition_start_value")
    private String conditionStartValue;

    @Column(name = "condition_end_value")
    private String conditionEndValue;

    public enum ConditionField {
        REQUESTED_DAYS
    }

    public enum ConditionOperator {
        EQUAL, GT, LT, GTE, LTE, RANGE
    }
}
