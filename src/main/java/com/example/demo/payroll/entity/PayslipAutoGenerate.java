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

    /** Whether auto-generation is enabled (GCP: auto_generate) */
    @Column(name = "auto_generate")
    private Boolean autoGenerate = false;

    /**
     * Day of month to auto-generate payslips.
     * Supports "last day" or ordinal string "1"-"31" (GCP: generate_day).
     */
    @Column(name = "generate_day")
    private String generateDay = "1";

    /** Email address to notify after generation (extra field not in GCP) */
    @Column(name = "notify_email")
    private String notifyEmail;
}
