package com.example.demo.onboarding.repository;

import com.example.demo.onboarding.entity.CandidateTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateTaskRepository extends JpaRepository<CandidateTask, Long>, JpaSpecificationExecutor<CandidateTask> {
    List<CandidateTask> findByOnboardingCandidateId(Long onboardingCandidateId);
    List<CandidateTask> findByStageId(Long stageId);
}
