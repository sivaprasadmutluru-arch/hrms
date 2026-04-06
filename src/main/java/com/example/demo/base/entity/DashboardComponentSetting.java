package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Tracks which dashboard chart components are enabled/disabled per company.
 * One row per component per company.
 */
@Entity
@Table(name = "dashboard_component_settings",
        uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "component_key"}))
@Getter
@Setter
public class DashboardComponentSetting extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    /**
     * Identifier for the component, e.g. "gender_chart", "department_chart",
     * "headcount_widget", "attendance_summary", "leave_summary"
     */
    @Column(name = "component_key", nullable = false, length = 100)
    private String componentKey;

    @Column(name = "is_enabled")
    private boolean isEnabled = true;
}
