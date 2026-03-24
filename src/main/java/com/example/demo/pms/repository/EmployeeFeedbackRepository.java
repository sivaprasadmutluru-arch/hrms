package com.example.demo.pms.repository;

import com.example.demo.pms.entity.EmployeeFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeFeedbackRepository extends JpaRepository<EmployeeFeedback, Long>, JpaSpecificationExecutor<EmployeeFeedback> {
    List<EmployeeFeedback> findByEmployeeId(Long employeeId);
    List<EmployeeFeedback> findByReviewerId(Long reviewerId);
    List<EmployeeFeedback> findByCycleId(Long cycleId);
}
