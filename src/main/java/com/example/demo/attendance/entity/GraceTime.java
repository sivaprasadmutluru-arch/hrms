package com.example.demo.attendance.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "attendance_grace_times")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class GraceTime extends BaseEntity {

    @Column(name = "allowed_time")
    private String allowedTime;

    @Column(name = "allowed_time_in_seconds")
    private Integer allowedTimeInSeconds;

    @Column(name = "allowed_clock_in")
    private Boolean allowedClockIn = true;

    @Column(name = "allowed_clock_out")
    private Boolean allowedClockOut = false;

    @Column(name = "is_default")
    private Boolean isDefault = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    // Org-level grace: set by ENTERPRISE_ADMIN as a default for all branches that have no branch-level override
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;
}
