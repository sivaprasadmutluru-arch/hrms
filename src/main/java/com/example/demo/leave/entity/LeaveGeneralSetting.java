package com.example.demo.leave.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "leave_general_settings")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class LeaveGeneralSetting extends BaseEntity {

    @Column(name = "compensatory_leave")
    private Boolean compensatoryLeave = true;

    @Column(name = "annual_carryforward_enabled")
    private Boolean annualCarryforwardEnabled = false;

    @Column(name = "max_carryforward_days")
    private Integer maxCarryforwardDays;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, unique = true)
    private Company company;
}
