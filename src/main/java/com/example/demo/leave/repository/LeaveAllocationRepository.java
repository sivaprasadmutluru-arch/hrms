package com.example.demo.leave.repository;

import com.example.demo.leave.entity.LeaveAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeaveAllocationRepository extends JpaRepository<LeaveAllocation, Long>, JpaSpecificationExecutor<LeaveAllocation> {
    List<LeaveAllocation> findByEmployeeId(Long employeeId);
    Optional<LeaveAllocation> findByEmployeeIdAndLeaveTypeIdAndYear(Long employeeId, Long leaveTypeId, Integer year);
    List<LeaveAllocation> findByCompanyId(Long companyId);
    List<LeaveAllocation> findByCompanyIdAndYear(Long companyId, Integer year);
}
