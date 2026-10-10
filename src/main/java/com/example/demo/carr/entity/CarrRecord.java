package com.example.demo.carr.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.example.demo.pms.entity.PerformanceCycle;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="carr_records", uniqueConstraints=@UniqueConstraint(name="uk_carr_employee_cycle_version", columnNames={"employee_id","cycle_id","version"}))
@Getter @Setter
public class CarrRecord extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="company_id", nullable=false) private Company company;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="employee_id", nullable=false) private Employee employee;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="template_id") private CarrRoleTemplate template;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="cycle_id") private PerformanceCycle cycle;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="manager_id") private Employee manager;
    @Column(nullable=false, length=180) private String title;
    @Column(columnDefinition="text") private String purpose;
    @Column(length=180) private String industry;
    @Column(name="role_level", length=80) private String roleLevel;
    @Column(name="reports_to_title", length=180) private String reportsToTitle;
    @Column(name="responsible_for", length=500) private String responsibleFor;
    @Column(name="rewards_enabled", nullable=false) private boolean rewardsEnabled;
    @Column(name="rewards_visible_to_employee", nullable=false) private boolean rewardsVisibleToEmployee = true;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=30) private CarrStatus status = CarrStatus.DRAFT;
    @Column(nullable=false) private int version = 1;
    @org.hibernate.annotations.ColumnDefault("false")
    @Column(name="task_record", nullable=false) private boolean taskRecord;
    @Column(name="effective_from") private LocalDate effectiveFrom;
    @Column(name="effective_to") private LocalDate effectiveTo;
    @Column(name="next_review_date") private LocalDate nextReviewDate;
    @Column(name="published_at") private LocalDateTime publishedAt;
    @Column(name="published_by") private Long publishedBy;
    @Column(name="return_reason", length=1000) private String returnReason;
    @Column(name="employee_acknowledged_at") private LocalDateTime employeeAcknowledgedAt;
    @Column(name="review_completed_at") private LocalDateTime reviewCompletedAt;
    @Column(name="employee_reflection", columnDefinition="text") private String employeeReflection;
    @Column(name="manager_comments", columnDefinition="text") private String managerComments;
}
