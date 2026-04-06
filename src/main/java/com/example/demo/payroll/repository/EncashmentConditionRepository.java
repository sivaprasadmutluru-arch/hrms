package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.EncashmentCondition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EncashmentConditionRepository extends JpaRepository<EncashmentCondition, Long> {
    Optional<EncashmentCondition> findByEmployeeId(Long employeeId);
}
