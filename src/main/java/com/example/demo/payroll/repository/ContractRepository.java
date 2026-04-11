package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long>, JpaSpecificationExecutor<Contract> {

    List<Contract> findByEmployeeId(Long employeeId);
    Optional<Contract> findByEmployeeIdAndContractStatus(Long employeeId, Contract.ContractStatus status);
    List<Contract> findByCompanyId(Long companyId);

    @Query("SELECT c FROM Contract c " +
           "LEFT JOIN FETCH c.employee " +
           "LEFT JOIN FETCH c.company " +
           "LEFT JOIN FETCH c.filingStatus " +
           "LEFT JOIN FETCH c.department " +
           "LEFT JOIN FETCH c.jobPosition " +
           "LEFT JOIN FETCH c.jobRole " +
           "LEFT JOIN FETCH c.shift " +
           "LEFT JOIN FETCH c.workType")
    List<Contract> findAllWithAssociations();

    @Query("SELECT c FROM Contract c " +
           "LEFT JOIN FETCH c.employee e " +
           "LEFT JOIN FETCH c.company " +
           "LEFT JOIN FETCH c.filingStatus " +
           "LEFT JOIN FETCH c.department " +
           "LEFT JOIN FETCH c.jobPosition " +
           "LEFT JOIN FETCH c.jobRole " +
           "LEFT JOIN FETCH c.shift " +
           "LEFT JOIN FETCH c.workType " +
           "WHERE c.company.id IN :companyIds")
    List<Contract> findAllWithAssociationsByCompanyIdIn(@Param("companyIds") List<Long> companyIds);

    @Query("SELECT c FROM Contract c " +
           "LEFT JOIN FETCH c.employee e " +
           "LEFT JOIN FETCH c.company " +
           "LEFT JOIN FETCH c.filingStatus " +
           "LEFT JOIN FETCH c.department " +
           "LEFT JOIN FETCH c.jobPosition " +
           "LEFT JOIN FETCH c.jobRole " +
           "LEFT JOIN FETCH c.shift " +
           "LEFT JOIN FETCH c.workType " +
           "WHERE e.company.id IN :companyIds")
    List<Contract> findAllWithAssociationsByEmployeeCompanyIdIn(@Param("companyIds") List<Long> companyIds);

    @Query("SELECT c FROM Contract c " +
           "LEFT JOIN FETCH c.employee " +
           "LEFT JOIN FETCH c.company " +
           "LEFT JOIN FETCH c.filingStatus " +
           "LEFT JOIN FETCH c.department " +
           "LEFT JOIN FETCH c.jobPosition " +
           "LEFT JOIN FETCH c.jobRole " +
           "LEFT JOIN FETCH c.shift " +
           "LEFT JOIN FETCH c.workType " +
           "WHERE c.id = :id")
    Optional<Contract> findByIdWithAssociations(@Param("id") Long id);
}
