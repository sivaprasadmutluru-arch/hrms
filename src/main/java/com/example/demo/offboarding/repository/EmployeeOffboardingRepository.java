package com.example.demo.offboarding.repository;

import com.example.demo.offboarding.entity.EmployeeOffboarding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EmployeeOffboardingRepository extends JpaRepository<EmployeeOffboarding, Long>, JpaSpecificationExecutor<EmployeeOffboarding> {
    List<EmployeeOffboarding> findByEmployeeId(Long employeeId);
    List<EmployeeOffboarding> findByStatus(EmployeeOffboarding.OffboardingStatus status);

    /** Due for automatic deactivation: not yet deactivated, and the effective date has arrived. */
    List<EmployeeOffboarding> findByEmployeeDeactivatedAtIsNullAndExitDateLessThanEqual(LocalDate date);
}
