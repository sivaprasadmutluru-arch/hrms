package com.example.demo.leave.repository;

import com.example.demo.leave.entity.LeaveAllocationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface LeaveAllocationRequestRepository extends JpaRepository<LeaveAllocationRequest, Long>, JpaSpecificationExecutor<LeaveAllocationRequest> {
}
