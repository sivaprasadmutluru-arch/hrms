package com.example.demo.employee.repository;

import com.example.demo.employee.entity.EmployeeWorkInformation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface EmployeeWorkInformationRepository extends JpaRepository<EmployeeWorkInformation, Long>, JpaSpecificationExecutor<EmployeeWorkInformation> {
    Optional<EmployeeWorkInformation> findByEmployeeId(Long employeeId);
}
