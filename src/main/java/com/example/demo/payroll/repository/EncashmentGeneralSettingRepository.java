package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.EncashmentGeneralSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EncashmentGeneralSettingRepository extends JpaRepository<EncashmentGeneralSetting, Long>, JpaSpecificationExecutor<EncashmentGeneralSetting> {
    Optional<EncashmentGeneralSetting> findByCompanyId(Long companyId);
}
