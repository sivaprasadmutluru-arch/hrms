package com.example.demo.employee.repository;

import com.example.demo.employee.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {
    List<Employee> findByCompanyId(Long companyId);
    List<Employee> findByCompanyIdAndIsActiveTrue(Long companyId);
    List<Employee> findByCompanyIdAndDepartmentIdAndIsActiveTrue(Long companyId, Long departmentId);
    long countByCompanyId(Long companyId);
    long countByCompanyIdAndIsActiveTrue(Long companyId);
    Optional<Employee> findByEmail(String email);
    Optional<Employee> findByBadgeId(String badgeId);
    Optional<Employee> findByBadgeIdAndCompanyId(String badgeId, Long companyId);
    Optional<Employee> findByUserId(Long userId);
    List<Employee> findByDepartmentId(Long departmentId);
    List<Employee> findByReportingManagerId(Long managerId);
}
