package com.example.demo.base.repository;

import com.example.demo.base.entity.ApprovalConditionManager;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface ApprovalConditionManagerRepository extends JpaRepository<ApprovalConditionManager, Long>, JpaSpecificationExecutor<ApprovalConditionManager> {
    List<ApprovalConditionManager> findByConditionIdOrderBySequenceAsc(Long conditionId);
}
