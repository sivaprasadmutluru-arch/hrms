package com.example.demo.onboarding.repository;

import com.example.demo.onboarding.entity.ProbationConfirmation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProbationConfirmationRepository extends JpaRepository<ProbationConfirmation, Long> {
    Optional<ProbationConfirmation> findByEmployeeId(Long employeeId);
    List<ProbationConfirmation> findByCompanyId(Long companyId);
}
