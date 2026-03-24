package com.example.demo.leave.repository;

import com.example.demo.leave.entity.LeaveAllocationRequestComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaveAllocationRequestCommentRepository extends JpaRepository<LeaveAllocationRequestComment, Long>, JpaSpecificationExecutor<LeaveAllocationRequestComment> {
    List<LeaveAllocationRequestComment> findByAllocationRequestId(Long allocationRequestId);
}
