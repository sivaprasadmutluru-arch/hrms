package com.example.demo.payroll.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "payroll_settings")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class PayrollSettings extends BaseEntity {

    @Column(name = "currency_symbol")
    private String currencySymbol = "$";

    @Enumerated(EnumType.STRING)
    @Column(name = "currency_position")
    private CurrencyPosition currencyPosition = CurrencyPosition.PREFIX;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", unique = true)
    private Company company;

    public enum CurrencyPosition {
        PREFIX, POSTFIX
    }
}
