package com.example.demo.offboarding.repository;

import com.example.demo.offboarding.entity.OffboardingGeneralSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OffboardingGeneralSettingRepository extends JpaRepository<OffboardingGeneralSetting, Long>, JpaSpecificationExecutor<OffboardingGeneralSetting> {
    Optional<OffboardingGeneralSetting> findByCompanyId(Long companyId);
}
