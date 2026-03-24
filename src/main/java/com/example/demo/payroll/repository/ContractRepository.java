package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long>, JpaSpecificationExecutor<Contract> {
    List<Contract> findByEmployeeId(Long employeeId);
    Optional<Contract> findByEmployeeIdAndContractStatus(Long employeeId, Contract.ContractStatus status);
    List<Contract> findByCompanyId(Long companyId);
}
