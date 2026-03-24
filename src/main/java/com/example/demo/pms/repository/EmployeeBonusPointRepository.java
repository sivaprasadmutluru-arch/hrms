package com.example.demo.pms.repository;

import com.example.demo.pms.entity.EmployeeBonusPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface EmployeeBonusPointRepository extends JpaRepository<EmployeeBonusPoint, Long>, JpaSpecificationExecutor<EmployeeBonusPoint> {
    List<EmployeeBonusPoint> findByEmployeeId(Long employeeId);
}
