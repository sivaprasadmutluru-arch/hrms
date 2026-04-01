package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceActivityRepository extends JpaRepository<AttendanceActivity, Long> {
    Page<AttendanceActivity> findByEmployeeCompanyId(Long companyId, Pageable pageable);
    List<AttendanceActivity> findByEmployeeCompanyId(Long companyId);
}
