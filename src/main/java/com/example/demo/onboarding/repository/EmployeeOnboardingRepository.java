package com.example.demo.onboarding.repository;

import com.example.demo.onboarding.entity.EmployeeOnboarding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeOnboardingRepository extends JpaRepository<EmployeeOnboarding, Long>, JpaSpecificationExecutor<EmployeeOnboarding> {
    List<EmployeeOnboarding> findByEmployeeId(Long employeeId);
    List<EmployeeOnboarding> findByEmployeeIdAndStatus(Long employeeId, EmployeeOnboarding.OnboardingStatus status);
}
