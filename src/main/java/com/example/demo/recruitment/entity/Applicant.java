package com.example.demo.recruitment.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "applicants")
@Getter
@Setter
public class Applicant extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recruitment_id", nullable = false)
    private RecruitmentPost recruitment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private RecruitmentStage stage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ApplicantStatus status = ApplicantStatus.IN_PROGRESS;

    @Column(name = "applied_date")
    private LocalDate appliedDate;

    @Column(name = "schedule_date")
    private LocalDate scheduleDate;

    @Column(name = "interviewer_id")
    private Long interviewerId;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "priority")
    @Enumerated(EnumType.STRING)
    private Priority priority = Priority.NORMAL;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    public enum ApplicantStatus {
        IN_PROGRESS, HIRED, REJECTED
    }

    public enum Priority {
        LOW, NORMAL, HIGH, VERY_HIGH
    }
}
