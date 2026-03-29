package com.example.demo.leave.repository;

import com.example.demo.leave.entity.CompensatoryLeaveRequestComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompensatoryLeaveRequestCommentRepository extends JpaRepository<CompensatoryLeaveRequestComment, Long> {
    List<CompensatoryLeaveRequestComment> findByRequestId(Long requestId);
}
