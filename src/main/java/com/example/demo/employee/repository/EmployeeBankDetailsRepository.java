package com.example.demo.employee.repository;

import com.example.demo.employee.entity.EmployeeBankDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface EmployeeBankDetailsRepository extends JpaRepository<EmployeeBankDetails, Long>, JpaSpecificationExecutor<EmployeeBankDetails> {
    Optional<EmployeeBankDetails> findByEmployeeId(Long employeeId);
}
