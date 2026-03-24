package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.Payslip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PayslipRepository extends JpaRepository<Payslip, Long>, JpaSpecificationExecutor<Payslip> {
    List<Payslip> findByEmployeeId(Long employeeId);
    List<Payslip> findByCompanyId(Long companyId);
    List<Payslip> findByCompanyIdAndStatus(Long companyId, Payslip.PayslipStatus status);
    List<Payslip> findByEmployeeIdAndStartDateBetween(Long employeeId, LocalDate from, LocalDate to);
}
