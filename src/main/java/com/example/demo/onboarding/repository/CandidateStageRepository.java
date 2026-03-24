package com.example.demo.onboarding.repository;

import com.example.demo.onboarding.entity.CandidateStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateStageRepository extends JpaRepository<CandidateStage, Long>, JpaSpecificationExecutor<CandidateStage> {
    List<CandidateStage> findByOnboardingCandidateId(Long onboardingCandidateId);
}
