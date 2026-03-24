package com.example.demo.recruitment.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.JobPosition;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "recruitment_posts")
@Getter
@Setter
public class RecruitmentPost extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_position_id")
    private JobPosition jobPosition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruitment_manager_id")
    private Employee recruitmentManager;

    @Column(name = "no_of_recruitment")
    private Integer noOfRecruitment;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private RecruitmentStatus status = RecruitmentStatus.OPEN;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_published")
    private Boolean isPublished = false;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    public enum RecruitmentStatus {
        OPEN, CLOSED, CANCELLED
    }
}
