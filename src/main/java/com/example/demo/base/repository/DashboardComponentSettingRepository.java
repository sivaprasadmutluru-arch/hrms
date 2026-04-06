package com.example.demo.base.repository;

import com.example.demo.base.entity.DashboardComponentSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DashboardComponentSettingRepository extends JpaRepository<DashboardComponentSetting, Long> {
    List<DashboardComponentSetting> findByCompanyId(Long companyId);
    Optional<DashboardComponentSetting> findByCompanyIdAndComponentKey(Long companyId, String componentKey);
}
