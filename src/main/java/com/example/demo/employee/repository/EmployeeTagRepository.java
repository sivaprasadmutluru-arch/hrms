package com.example.demo.employee.repository;

import com.example.demo.employee.entity.EmployeeTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeTagRepository extends JpaRepository<EmployeeTag, Long>,
        JpaSpecificationExecutor<EmployeeTag> {

    List<EmployeeTag> findByCompanyId(Long companyId);
}
