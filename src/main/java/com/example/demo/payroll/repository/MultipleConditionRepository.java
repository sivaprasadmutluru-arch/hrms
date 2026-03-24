package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.MultipleCondition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MultipleConditionRepository extends JpaRepository<MultipleCondition, Long>,
        JpaSpecificationExecutor<MultipleCondition> {

    List<MultipleCondition> findByAllowanceId(Long allowanceId);
    List<MultipleCondition> findByDeductionId(Long deductionId);
}
