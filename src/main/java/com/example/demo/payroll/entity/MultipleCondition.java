package com.example.demo.payroll.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "payroll_multiple_conditions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class MultipleCondition extends BaseEntity {

    @Column(name = "field", nullable = false)
    private String field;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", nullable = false)
    private ConditionType conditionType;

    @Column(name = "value", nullable = false)
    private String value;

    /**
     * If true, this condition applies to the allowance side.
     * If false, it applies to the deduction side.
     */
    @Column(name = "is_allowance")
    private Boolean isAllowance = true;

    /**
     * Optional FK to an Allowance or Deduction record — stored as a polymorphic
     * reference via separate nullable columns (allowanceId / deductionId).
     */
    @Column(name = "allowance_id")
    private Long allowanceId;

    @Column(name = "deduction_id")
    private Long deductionId;

    public enum ConditionType {
        EQUAL, NOT_EQUAL, GREATER_THAN, LESS_THAN, GREATER_THAN_OR_EQUAL, LESS_THAN_OR_EQUAL, CONTAINS
    }
}
