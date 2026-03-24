package com.example.demo.onboarding.repository;

import com.example.demo.onboarding.entity.OnboardingCandidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OnboardingCandidateRepository extends JpaRepository<OnboardingCandidate, Long>, JpaSpecificationExecutor<OnboardingCandidate> {
    List<OnboardingCandidate> findByPortalId(Long portalId);
    List<OnboardingCandidate> findByCandidateId(Long candidateId);
}
