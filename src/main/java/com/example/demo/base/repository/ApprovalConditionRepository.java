package com.example.demo.base.repository;

import com.example.demo.base.entity.ApprovalCondition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ApprovalConditionRepository extends JpaRepository<ApprovalCondition, Long>, JpaSpecificationExecutor<ApprovalCondition> {
}
