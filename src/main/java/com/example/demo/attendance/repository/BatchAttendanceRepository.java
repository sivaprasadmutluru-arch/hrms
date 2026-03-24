package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.BatchAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BatchAttendanceRepository
        extends JpaRepository<BatchAttendance, Long>,
                JpaSpecificationExecutor<BatchAttendance> {

    List<BatchAttendance> findByCompanyId(Long companyId);
}
