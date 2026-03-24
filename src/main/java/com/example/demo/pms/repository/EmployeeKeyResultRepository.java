package com.example.demo.pms.repository;

import com.example.demo.pms.entity.EmployeeKeyResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeKeyResultRepository extends JpaRepository<EmployeeKeyResult, Long>, JpaSpecificationExecutor<EmployeeKeyResult> {
    List<EmployeeKeyResult> findByEmployeeId(Long employeeId);
    List<EmployeeKeyResult> findByKeyResultId(Long keyResultId);
}
