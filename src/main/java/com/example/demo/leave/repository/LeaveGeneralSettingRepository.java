package com.example.demo.leave.repository;

import com.example.demo.leave.entity.LeaveGeneralSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface LeaveGeneralSettingRepository extends JpaRepository<LeaveGeneralSetting, Long>, JpaSpecificationExecutor<LeaveGeneralSetting> {
    Optional<LeaveGeneralSetting> findByCompanyId(Long companyId);
}
