package com.example.demo.base.repository;

import com.example.demo.base.entity.ShiftRequestComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShiftRequestCommentRepository extends JpaRepository<ShiftRequestComment, Long>, JpaSpecificationExecutor<ShiftRequestComment> {
    List<ShiftRequestComment> findByShiftRequestId(Long shiftRequestId);
}
