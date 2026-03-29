package com.example.demo.payroll.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "payroll_filing_statuses")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class FilingStatus extends BaseEntity {

    @Column(name = "filing_status", nullable = false)
    private String filingStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "based_on")
    private BasedOn basedOn = BasedOn.BASIC_PAY;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "use_py")
    private Boolean usePy = false;

    @Column(name = "python_code", columnDefinition = "TEXT")
    private String pythonCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    public enum BasedOn {
        BASIC_PAY, GROSS_PAY, TAXABLE_GROSS_PAY
    }
}
