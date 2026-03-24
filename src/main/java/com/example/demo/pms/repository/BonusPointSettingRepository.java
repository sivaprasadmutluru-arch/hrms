package com.example.demo.pms.repository;

import com.example.demo.pms.entity.BonusPointSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BonusPointSettingRepository extends JpaRepository<BonusPointSetting, Long>, JpaSpecificationExecutor<BonusPointSetting> {
    Optional<BonusPointSetting> findByCompanyId(Long companyId);
}
