package com.example.demo.onboarding.repository;

import com.example.demo.onboarding.entity.ProbationPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProbationPolicyRepository extends JpaRepository<ProbationPolicy, Long> {
    Optional<ProbationPolicy> findByCompanyId(Long companyId);
    List<ProbationPolicy> findByEnabledTrue();
}
