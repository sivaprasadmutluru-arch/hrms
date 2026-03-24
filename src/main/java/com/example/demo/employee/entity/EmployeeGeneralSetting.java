package com.example.demo.employee.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "employee_general_settings",
        uniqueConstraints = @UniqueConstraint(columnNames = "company_id"))
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class EmployeeGeneralSetting extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    /** Whether to display badge ID on employee profiles */
    @Column(name = "show_badge_id")
    private Boolean showBadgeId = true;

    /** Whether employees can view each other's profiles */
    @Column(name = "allow_profile_view")
    private Boolean allowProfileView = false;

    /** Number of days before contract expiry to send a warning notification */
    @Column(name = "contract_warning_days")
    private Integer contractWarningDays = 30;
}
