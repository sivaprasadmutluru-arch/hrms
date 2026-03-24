package com.example.demo.base.repository;

import com.example.demo.base.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long>, JpaSpecificationExecutor<Department> {
    List<Department> findByCompanyId(Long companyId);
    List<Department> findByCompanyIdAndIsActiveTrue(Long companyId);
}
