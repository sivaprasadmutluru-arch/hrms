package com.example.demo.employee.repository;

import com.example.demo.employee.entity.BonusPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface BonusPointRepository extends JpaRepository<BonusPoint, Long>, JpaSpecificationExecutor<BonusPoint> {
    Optional<BonusPoint> findByEmployeeId(Long employeeId);
}
