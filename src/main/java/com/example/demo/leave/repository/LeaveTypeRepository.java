package com.example.demo.leave.repository;

import com.example.demo.leave.entity.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaveTypeRepository extends JpaRepository<LeaveType, Long>, JpaSpecificationExecutor<LeaveType> {
    List<LeaveType> findByCompanyId(Long companyId);
    List<LeaveType> findByCompanyIdAndIsActiveTrue(Long companyId);
    List<LeaveType> findByResetTrue();
    List<LeaveType> findByAccrualEnabledTrue();
}
