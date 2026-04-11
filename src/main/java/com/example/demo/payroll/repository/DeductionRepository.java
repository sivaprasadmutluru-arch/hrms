package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.Deduction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeductionRepository extends JpaRepository<Deduction, Long>, JpaSpecificationExecutor<Deduction> {
    List<Deduction> findByCompanyId(Long companyId);

    /** Deductions explicitly assigned to this employee */
    @Query("SELECT DISTINCT d FROM Deduction d JOIN d.specificEmployees se WHERE se.id = :employeeId AND d.company.id = :companyId")
    List<Deduction> findSpecificForEmployee(@Param("employeeId") Long employeeId, @Param("companyId") Long companyId);

    /** Condition-based deductions that do NOT exclude this employee */
    @Query("SELECT DISTINCT d FROM Deduction d WHERE d.isConditionBased = true AND d.company.id = :companyId AND :employeeId NOT IN (SELECT e.id FROM d.excludeEmployees e)")
    List<Deduction> findConditionalNotExcluded(@Param("employeeId") Long employeeId, @Param("companyId") Long companyId);

    /** includeActiveEmployees deductions that do NOT exclude this employee */
    @Query("SELECT DISTINCT d FROM Deduction d WHERE d.includeActiveEmployees = true AND d.company.id = :companyId AND :employeeId NOT IN (SELECT e.id FROM d.excludeEmployees e)")
    List<Deduction> findActiveEmployeeNotExcluded(@Param("employeeId") Long employeeId, @Param("companyId") Long companyId);
}
