package com.example.demo.recruitment.repository;

import com.example.demo.recruitment.entity.RecruitmentGeneralSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RecruitmentGeneralSettingRepository extends JpaRepository<RecruitmentGeneralSetting, Long>, JpaSpecificationExecutor<RecruitmentGeneralSetting> {
    Optional<RecruitmentGeneralSetting> findByCompanyId(Long companyId);
}
