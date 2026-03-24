package com.example.demo.leave.repository;

import com.example.demo.leave.entity.AvailableLeave;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface AvailableLeaveRepository extends JpaRepository<AvailableLeave, Long>, JpaSpecificationExecutor<AvailableLeave> {
    List<AvailableLeave> findByEmployeeId(Long employeeId);
    Optional<AvailableLeave> findByEmployeeIdAndLeaveTypeId(Long employeeId, Long leaveTypeId);
}
