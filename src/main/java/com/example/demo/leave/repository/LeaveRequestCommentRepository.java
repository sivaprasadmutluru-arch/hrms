package com.example.demo.leave.repository;

import com.example.demo.leave.entity.LeaveRequestComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaveRequestCommentRepository extends JpaRepository<LeaveRequestComment, Long>, JpaSpecificationExecutor<LeaveRequestComment> {
    List<LeaveRequestComment> findByLeaveRequestId(Long leaveRequestId);
}
