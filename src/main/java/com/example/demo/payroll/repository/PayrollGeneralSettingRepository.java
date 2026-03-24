package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.PayrollGeneralSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PayrollGeneralSettingRepository extends JpaRepository<PayrollGeneralSetting, Long>, JpaSpecificationExecutor<PayrollGeneralSetting> {
    Optional<PayrollGeneralSetting> findByCompanyId(Long companyId);
}
