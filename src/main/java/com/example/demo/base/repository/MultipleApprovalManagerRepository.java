package com.example.demo.base.repository;

import com.example.demo.base.entity.MultipleApprovalManager;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MultipleApprovalManagerRepository extends JpaRepository<MultipleApprovalManager, Long> {
    List<MultipleApprovalManager> findByConditionIdOrderBySequenceAsc(Long conditionId);
}
