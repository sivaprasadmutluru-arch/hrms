package com.example.demo.offboarding.repository;

import com.example.demo.offboarding.entity.ExitReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ExitReasonRepository extends JpaRepository<ExitReason, Long>, JpaSpecificationExecutor<ExitReason> {
    List<ExitReason> findByOffboardingId(Long offboardingId);
}
