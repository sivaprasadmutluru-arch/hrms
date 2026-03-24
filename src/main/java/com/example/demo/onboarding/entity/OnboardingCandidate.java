package com.example.demo.onboarding.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.recruitment.entity.Candidate;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "onboarding_candidates")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class OnboardingCandidate extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "portal_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private OnboardingPortal portal;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private OnboardingStatus status = OnboardingStatus.IN_PROGRESS;

    public enum OnboardingStatus {
        IN_PROGRESS, COMPLETED, CANCELLED
    }
}
