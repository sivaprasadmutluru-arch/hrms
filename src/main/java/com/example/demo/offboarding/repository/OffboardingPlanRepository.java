package com.example.demo.offboarding.repository;

import com.example.demo.offboarding.entity.OffboardingPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface OffboardingPlanRepository extends JpaRepository<OffboardingPlan, Long>, JpaSpecificationExecutor<OffboardingPlan> {
}
