package com.example.demo.payroll.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "payroll_payslip_auto_generate",
        uniqueConstraints = @UniqueConstraint(columnNames = "company_id"))
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class PayslipAutoGenerate extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    /** Whether auto-generation is enabled */
    @Column(name = "is_enabled")
    private Boolean isEnabled = false;

    /**
     * Day of month to auto-generate payslips (1–31).
     * If the month has fewer days the last day is used.
     */
    @Column(name = "generate_day")
    private Integer generateDay = 1;

    /** Email address to notify after generation */
    @Column(name = "notify_email")
    private String notifyEmail;
}
