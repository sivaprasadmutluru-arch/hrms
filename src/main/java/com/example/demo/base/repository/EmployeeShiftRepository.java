package com.example.demo.base.repository;

import com.example.demo.base.entity.EmployeeShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeShiftRepository extends JpaRepository<EmployeeShift, Long>, JpaSpecificationExecutor<EmployeeShift> {
    List<EmployeeShift> findByCompanyId(Long companyId);
}
