package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.PayslipAutoGenerate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PayslipAutoGenerateRepository extends JpaRepository<PayslipAutoGenerate, Long>, JpaSpecificationExecutor<PayslipAutoGenerate> {
    Optional<PayslipAutoGenerate> findByCompanyId(Long companyId);
}
