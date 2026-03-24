package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceAllowedIP;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceAllowedIPRepository
        extends JpaRepository<AttendanceAllowedIP, Long>,
                JpaSpecificationExecutor<AttendanceAllowedIP> {

    List<AttendanceAllowedIP> findByCompanyId(Long companyId);
    List<AttendanceAllowedIP> findByCompanyIdAndIsEnabled(Long companyId, Boolean isEnabled);
}
