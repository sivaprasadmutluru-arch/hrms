package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.Reimbursement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReimbursementRepository extends JpaRepository<Reimbursement, Long>, JpaSpecificationExecutor<Reimbursement> {
    List<Reimbursement> findByEmployeeIdAndStatusAndAllowanceOnBetween(
            Long employeeId, Reimbursement.ReimbursementStatus status, LocalDate from, LocalDate to);
    List<Reimbursement> findByCompanyId(Long companyId);
    List<Reimbursement> findByEmployeeIdAndStatus(Long employeeId, Reimbursement.ReimbursementStatus status);
}
