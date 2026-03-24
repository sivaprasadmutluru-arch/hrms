package com.example.demo.pms.repository;

import com.example.demo.pms.entity.KeyResultFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KeyResultFeedbackRepository extends JpaRepository<KeyResultFeedback, Long>, JpaSpecificationExecutor<KeyResultFeedback> {
    List<KeyResultFeedback> findByKeyResultId(Long keyResultId);
}
