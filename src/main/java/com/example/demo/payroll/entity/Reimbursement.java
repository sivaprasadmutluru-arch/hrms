package com.example.demo.payroll.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

@Entity
@Table(name = "payroll_reimbursements")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class Reimbursement extends BaseEntity {

    @Column(name = "title", nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "reimbursement_type")
    private ReimbursementType reimbursementType = ReimbursementType.REIMBURSEMENT;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ReimbursementStatus status = ReimbursementStatus.REQUESTED;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "company", "department",
            "jobPosition", "jobRole", "workType", "shift", "reportingManager", "user"})
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "company", "department",
            "jobPosition", "jobRole", "workType", "shift", "reportingManager", "user"})
    private Employee approvedBy;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "allowance_on")
    private LocalDate allowanceOn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leave_type_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private com.example.demo.leave.entity.LeaveType leaveType;

    @Column(name = "ad_to_encash")
    private Double adToEncash = 0.0;

    @Column(name = "cfd_to_encash")
    private Double cfdToEncash = 0.0;

    @Column(name = "bonus_to_encash")
    private Integer bonusToEncash = 0;

    @Column(name = "attachment_path")
    private String attachmentPath;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allowance_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Allowance allowance;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "reimbursement_other_attachments",
            joinColumns = @JoinColumn(name = "reimbursement_id"),
            inverseJoinColumns = @JoinColumn(name = "attachment_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Set<ReimbursementMultipleAttachment> otherAttachments;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    public enum ReimbursementType {
        REIMBURSEMENT, BONUS_ENCASHMENT, LEAVE_ENCASHMENT
    }

    public enum ReimbursementStatus {
        REQUESTED, APPROVED, REJECTED
    }
}
