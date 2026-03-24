package com.example.demo.base.repository;

import com.example.demo.base.entity.EmployeeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeTypeRepository extends JpaRepository<EmployeeType, Long>, JpaSpecificationExecutor<EmployeeType> {
    List<EmployeeType> findByCompanyId(Long companyId);
}
