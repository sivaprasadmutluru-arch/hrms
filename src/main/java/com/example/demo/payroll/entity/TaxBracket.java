package com.example.demo.payroll.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "payroll_tax_brackets")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class TaxBracket extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "filing_status_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private FilingStatus filingStatus;

    @Column(name = "min_income", nullable = false)
    private Double minIncome;

    @Column(name = "max_income")
    private Double maxIncome;

    @Column(name = "tax_rate", nullable = false)
    private Double taxRate;
}
