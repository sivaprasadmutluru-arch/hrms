package com.example.demo.offboarding.repository;

import com.example.demo.offboarding.entity.OffboardingStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OffboardingStageRepository extends JpaRepository<OffboardingStage, Long>, JpaSpecificationExecutor<OffboardingStage> {
    List<OffboardingStage> findByPlanIdOrderBySequenceAsc(Long planId);
}
