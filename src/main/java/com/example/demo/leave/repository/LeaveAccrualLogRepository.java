package com.example.demo.leave.repository;

import com.example.demo.leave.entity.LeaveAccrualLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface LeaveAccrualLogRepository extends JpaRepository<LeaveAccrualLog, Long> {

    boolean existsByEmployeeIdAndLeaveTypeIdAndAccrualDate(Long employeeId, Long leaveTypeId, LocalDate accrualDate);

    List<LeaveAccrualLog> findByEmployeeIdAndLeaveTypeIdOrderByAccrualDateDesc(Long employeeId, Long leaveTypeId);

    List<LeaveAccrualLog> findByEmployeeIdOrderByAccrualDateDesc(Long employeeId);
}
