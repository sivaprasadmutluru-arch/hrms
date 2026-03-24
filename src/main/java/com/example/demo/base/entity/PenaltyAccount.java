package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "penalty_accounts")
@Getter
@Setter
public class PenaltyAccount extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "deduct_from")
    private DeductFrom deductFrom = DeductFrom.SALARY;

    @Column(name = "deduction_amount")
    private Double deductionAmount;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    public enum DeductFrom {
        SALARY, LEAVE, BONUS
    }
}
