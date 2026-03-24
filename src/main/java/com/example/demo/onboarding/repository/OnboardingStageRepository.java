package com.example.demo.onboarding.repository;

import com.example.demo.onboarding.entity.OnboardingStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OnboardingStageRepository extends JpaRepository<OnboardingStage, Long>, JpaSpecificationExecutor<OnboardingStage> {
    List<OnboardingStage> findByPortalIdOrderBySequenceAsc(Long portalId);
}
