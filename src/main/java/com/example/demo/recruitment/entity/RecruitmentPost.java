package com.example.demo.recruitment.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.JobPosition;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "recruitment_open_positions",
        joinColumns = @JoinColumn(name = "recruitment_id"),
        inverseJoinColumns = @JoinColumn(name = "job_position_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private List<JobPosition> openPositions = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "recruitment_managers",
        joinColumns = @JoinColumn(name = "recruitment_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id"))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private List<Employee> recruitmentManagers = new ArrayList<>();

    @Column(name = "vacancy")
    private Integer vacancy;

    @Column(name = "publication_date")
    private LocalDate publicationDate;

    @Column(name = "closed")
    private boolean closed = false;

    @Column(name = "is_event_based")
    private boolean isEventBased = false;

    @Column(name = "publish_in_linkedin")
    private boolean publishInLinkedin = false;

    public enum RecruitmentStatus {
        OPEN, CLOSED, CANCELLED
    }
}
