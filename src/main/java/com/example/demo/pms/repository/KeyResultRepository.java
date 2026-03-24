package com.example.demo.pms.repository;

import com.example.demo.pms.entity.KeyResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KeyResultRepository extends JpaRepository<KeyResult, Long>, JpaSpecificationExecutor<KeyResult> {
    List<KeyResult> findByObjectiveId(Long objectiveId);
}
