package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.Allowance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AllowanceRepository extends JpaRepository<Allowance, Long>, JpaSpecificationExecutor<Allowance> {
    List<Allowance> findByCompanyId(Long companyId);

    /** Allowances explicitly assigned to this employee */
    @Query("SELECT DISTINCT a FROM Allowance a JOIN a.specificEmployees se WHERE se.id = :employeeId AND a.company.id = :companyId")
    List<Allowance> findSpecificForEmployee(@Param("employeeId") Long employeeId, @Param("companyId") Long companyId);

    /** Condition-based allowances that do NOT exclude this employee */
    @Query("SELECT DISTINCT a FROM Allowance a WHERE a.isConditionBased = true AND a.company.id = :companyId AND :employeeId NOT IN (SELECT e.id FROM a.excludeEmployees e)")
    List<Allowance> findConditionalNotExcluded(@Param("employeeId") Long employeeId, @Param("companyId") Long companyId);

    /** includeActiveEmployees allowances that do NOT exclude this employee */
    @Query("SELECT DISTINCT a FROM Allowance a WHERE a.includeActiveEmployees = true AND a.company.id = :companyId AND :employeeId NOT IN (SELECT e.id FROM a.excludeEmployees e)")
    List<Allowance> findActiveEmployeeNotExcluded(@Param("employeeId") Long employeeId, @Param("companyId") Long companyId);
}
