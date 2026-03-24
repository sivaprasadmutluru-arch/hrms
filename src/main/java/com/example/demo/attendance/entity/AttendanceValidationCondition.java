package com.example.demo.attendance.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "attendance_validation_conditions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class AttendanceValidationCondition extends BaseEntity {

    @Column(name = "validation_at_work")
    private String validationAtWork;

    @Column(name = "minimum_overtime_to_approve")
    private String minimumOvertimeToApprove;

    @Column(name = "overtime_cutoff")
    private String overtimeCutoff;

    @Column(name = "auto_approve_ot")
    private Boolean autoApproveOt = false;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", unique = true)
    private Company company;
}
