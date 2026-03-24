package com.example.demo.base.repository;

import com.example.demo.base.entity.EmployeeShiftDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeShiftDayRepository extends JpaRepository<EmployeeShiftDay, Long>, JpaSpecificationExecutor<EmployeeShiftDay> {
    List<EmployeeShiftDay> findByShiftId(Long shiftId);
}
