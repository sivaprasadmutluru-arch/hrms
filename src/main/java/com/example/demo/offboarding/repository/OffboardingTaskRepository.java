package com.example.demo.offboarding.repository;

import com.example.demo.offboarding.entity.OffboardingTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OffboardingTaskRepository extends JpaRepository<OffboardingTask, Long> {
}
