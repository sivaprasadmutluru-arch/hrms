package com.example.demo.base.repository;

import com.example.demo.base.entity.MultipleApprovalCondition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface MultipleApprovalConditionRepository extends JpaRepository<MultipleApprovalCondition, Long>, JpaSpecificationExecutor<MultipleApprovalCondition> {
    List<MultipleApprovalCondition> findByDepartmentId(Long departmentId);
}
