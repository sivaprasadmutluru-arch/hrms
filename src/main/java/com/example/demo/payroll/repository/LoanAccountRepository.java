package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.LoanAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanAccountRepository extends JpaRepository<LoanAccount, Long>, JpaSpecificationExecutor<LoanAccount> {
    List<LoanAccount> findByEmployeeIdAndSettledFalse(Long employeeId);
    List<LoanAccount> findByCompanyId(Long companyId);
}
