package com.example.demo.pms.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Department;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "pms_anonymous_feedbacks")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class AnonymousFeedback extends BaseEntity {

    @Column(name = "feedback_subject", nullable = false)
    private String feedbackSubject;

    @Enumerated(EnumType.STRING)
    @Column(name = "based_on")
    private BasedOn basedOn = BasedOn.GENERAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private FeedbackStatus status = FeedbackStatus.ON_TRACK;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_employee_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Employee targetEmployee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_department_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Department targetDepartment;

    @Column(name = "feedback_description", columnDefinition = "TEXT")
    private String feedbackDescription;

    @Column(name = "archive")
    private Boolean archive = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    public enum BasedOn {
        GENERAL, EMPLOYEE, DEPARTMENT, JOB_POSITION
    }

    public enum FeedbackStatus {
        ON_TRACK, BEHIND, CLOSED, AT_RISK, NOT_STARTED
    }
}
