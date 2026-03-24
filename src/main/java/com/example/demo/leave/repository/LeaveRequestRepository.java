package com.example.demo.leave.repository;

import com.example.demo.leave.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long>, JpaSpecificationExecutor<LeaveRequest> {
    List<LeaveRequest> findByEmployeeId(Long employeeId);
    List<LeaveRequest> findByCompanyId(Long companyId);
    List<LeaveRequest> findByCompanyIdAndStatus(Long companyId, LeaveRequest.LeaveStatus status);
    List<LeaveRequest> findByEmployeeIdAndStatus(Long employeeId, LeaveRequest.LeaveStatus status);
    List<LeaveRequest> findByEmployeeIdAndStartDateBetween(Long employeeId, LocalDate from, LocalDate to);
}
