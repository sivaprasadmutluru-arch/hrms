package com.example.demo.pms.repository;

import com.example.demo.pms.entity.ObjectiveComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ObjectiveCommentRepository extends JpaRepository<ObjectiveComment, Long>, JpaSpecificationExecutor<ObjectiveComment> {
    List<ObjectiveComment> findByObjectiveId(Long objectiveId);
}
