package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceValidationCondition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface AttendanceValidationConditionRepository extends JpaRepository<AttendanceValidationCondition, Long>, JpaSpecificationExecutor<AttendanceValidationCondition> {
    Optional<AttendanceValidationCondition> findByCompanyId(Long companyId);
}
