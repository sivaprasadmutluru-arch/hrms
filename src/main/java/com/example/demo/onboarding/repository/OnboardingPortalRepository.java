package com.example.demo.onboarding.repository;

import com.example.demo.onboarding.entity.OnboardingPortal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface OnboardingPortalRepository extends JpaRepository<OnboardingPortal, Long>, JpaSpecificationExecutor<OnboardingPortal> {
}
