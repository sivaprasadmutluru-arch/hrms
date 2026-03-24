package com.example.demo.base.repository;

import com.example.demo.base.entity.WorkTypeRequestComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkTypeRequestCommentRepository extends JpaRepository<WorkTypeRequestComment, Long>, JpaSpecificationExecutor<WorkTypeRequestComment> {
    List<WorkTypeRequestComment> findByWorkTypeRequestId(Long workTypeRequestId);
}
