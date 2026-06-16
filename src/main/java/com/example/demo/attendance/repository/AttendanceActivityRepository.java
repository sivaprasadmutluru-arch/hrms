package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AttendanceActivityRepository extends JpaRepository<AttendanceActivity, Long>, JpaSpecificationExecutor<AttendanceActivity> {
    Page<AttendanceActivity> findByEmployeeCompanyId(Long companyId, Pageable pageable);
    List<AttendanceActivity> findByEmployeeCompanyId(Long companyId);
    List<AttendanceActivity> findByEmployeeIdAndAttendanceDate(Long employeeId, LocalDate attendanceDate);
}
