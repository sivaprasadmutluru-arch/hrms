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
    List<Contract> findByEmployeeIdIn(List<Long> employeeIds);
    Optional<Contract> findByEmployeeIdAndContractStatus(Long employeeId, Contract.ContractStatus status);
    List<Contract> findByEmployeeIdAndContractStatusIn(Long employeeId, List<Contract.ContractStatus> statuses);
    List<Contract> findByCompanyId(Long companyId);

    /** The contract to use for salary/payroll calculations: the ACTIVE one if there is one,
     *  otherwise the most recently created contract of any status (e.g. still DRAFT) rather
     *  than silently treating the employee as having no salary at all. */
    @Query("SELECT c FROM Contract c WHERE c.employee.id = :employeeId " +
           "ORDER BY CASE WHEN c.contractStatus = :activeStatus THEN 0 ELSE 1 END, c.createdAt DESC")
    List<Contract> findByEmployeeIdOrderByActiveFirstThenRecent(
            @Param("employeeId") Long employeeId, @Param("activeStatus") Contract.ContractStatus activeStatus);

    default Optional<Contract> findBestContractForPayroll(Long employeeId) {
        return findByEmployeeIdOrderByActiveFirstThenRecent(employeeId, Contract.ContractStatus.ACTIVE)
                .stream().findFirst();
    }

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
