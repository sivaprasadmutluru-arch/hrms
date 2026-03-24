package com.example.demo.onboarding.repository;

import com.example.demo.onboarding.entity.OnboardingTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OnboardingTaskRepository extends JpaRepository<OnboardingTask, Long>, JpaSpecificationExecutor<OnboardingTask> {
    List<OnboardingTask> findByCompanyId(Long companyId);
}
