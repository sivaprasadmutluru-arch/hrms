package com.example.demo.employee.repository;

import com.example.demo.employee.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Employee e where e.id = :id")
    Optional<Employee> findByIdForProbationConfirmation(@Param("id") Long id);
    List<Employee> findByCompanyId(Long companyId);
    List<Employee> findByCompanyIdAndIsActiveTrue(Long companyId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user", "company", "department"})
    List<Employee> findByCompanyIdInAndIsActiveTrue(List<Long> companyIds);
    List<Employee> findByCompanyIdAndDepartmentIdAndIsActiveTrue(Long companyId, Long departmentId);
    long countByCompanyId(Long companyId);
    long countByCompanyIdAndIsActiveTrue(Long companyId);
    Optional<Employee> findByEmail(String email);
    @Query("select e from Employee e where lower(trim(e.email)) = lower(trim(:email))")
    Optional<Employee> findFirstByNormalizedEmail(@Param("email") String email);
    Optional<Employee> findByPhone(String phone);
    Optional<Employee> findByBadgeId(String badgeId);
    @Query("select e from Employee e where lower(trim(e.badgeId)) = lower(trim(:badgeId))")
    Optional<Employee> findFirstByNormalizedBadgeId(@Param("badgeId") String badgeId);
    Optional<Employee> findByBadgeIdAndCompanyId(String badgeId, Long companyId);
    Optional<Employee> findByUserId(Long userId);
    List<Employee> findByDepartmentId(Long departmentId);
    List<Employee> findByReportingManagerId(Long managerId);
}
