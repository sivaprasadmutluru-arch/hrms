package com.example.demo.leave.repository;

import com.example.demo.leave.entity.LeaveRequestConditionApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaveRequestConditionApprovalRepository extends JpaRepository<LeaveRequestConditionApproval, Long>, JpaSpecificationExecutor<LeaveRequestConditionApproval> {
    List<LeaveRequestConditionApproval> findByLeaveRequestIdOrderBySequenceAsc(Long leaveRequestId);
    List<LeaveRequestConditionApproval> findByManagerId(Long managerId);
}
