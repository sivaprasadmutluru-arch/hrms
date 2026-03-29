package com.example.demo.leave.repository;

import com.example.demo.leave.entity.CompensatoryLeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompensatoryLeaveRequestRepository extends JpaRepository<CompensatoryLeaveRequest, Long> {
    List<CompensatoryLeaveRequest> findByEmployeeId(Long employeeId);
    List<CompensatoryLeaveRequest> findByStatus(String status);
}
