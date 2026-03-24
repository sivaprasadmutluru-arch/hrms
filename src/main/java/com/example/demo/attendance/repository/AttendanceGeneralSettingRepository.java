package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceGeneralSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AttendanceGeneralSettingRepository extends JpaRepository<AttendanceGeneralSetting, Long>, JpaSpecificationExecutor<AttendanceGeneralSetting> {
    Optional<AttendanceGeneralSetting> findByCompanyId(Long companyId);
}
