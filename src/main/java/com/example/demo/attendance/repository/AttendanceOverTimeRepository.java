package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceOverTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceOverTimeRepository extends JpaRepository<AttendanceOverTime, Long>, JpaSpecificationExecutor<AttendanceOverTime> {
    List<AttendanceOverTime> findByCompanyId(Long companyId);
    List<AttendanceOverTime> findByEmployeeId(Long employeeId);
    Optional<AttendanceOverTime> findByEmployeeIdAndMonthAndYear(Long employeeId, String month, Integer year);
}
