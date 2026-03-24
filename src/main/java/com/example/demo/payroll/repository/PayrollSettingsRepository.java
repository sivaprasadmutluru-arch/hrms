package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.PayrollSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface PayrollSettingsRepository extends JpaRepository<PayrollSettings, Long>, JpaSpecificationExecutor<PayrollSettings> {
    Optional<PayrollSettings> findByCompanyId(Long companyId);
}
