package com.example.demo.base.repository;

import com.example.demo.base.entity.ShiftAllocationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShiftAllocationRequestRepository extends JpaRepository<ShiftAllocationRequest, Long>, JpaSpecificationExecutor<ShiftAllocationRequest> {
    List<ShiftAllocationRequest> findByCompanyId(Long companyId);
    List<ShiftAllocationRequest> findByEmployeeId(Long employeeId);
    List<ShiftAllocationRequest> findByCompanyIdAndStatus(Long companyId, ShiftAllocationRequest.AllocationStatus status);
}
