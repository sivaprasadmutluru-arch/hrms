package com.example.demo.offboarding.repository;

import com.example.demo.offboarding.entity.OffboardingEmployeeTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OffboardingEmployeeTaskRepository extends JpaRepository<OffboardingEmployeeTask, Long>, JpaSpecificationExecutor<OffboardingEmployeeTask> {
    List<OffboardingEmployeeTask> findByEmployeeOffboardingId(Long employeeOffboardingId);
}
