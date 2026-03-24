package com.example.demo.recruitment.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "recruitment_general_settings",
        uniqueConstraints = @UniqueConstraint(columnNames = "company_id"))
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class RecruitmentGeneralSetting extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    /** Whether to send an email confirmation to candidates on application */
    @Column(name = "send_confirmation_email")
    private Boolean sendConfirmationEmail = true;

    /** Whether to show salary range in job postings */
    @Column(name = "show_salary_range")
    private Boolean showSalaryRange = false;

    /** Auto-move candidate to next stage after interview completion */
    @Column(name = "auto_advance_on_interview")
    private Boolean autoAdvanceOnInterview = false;
}
