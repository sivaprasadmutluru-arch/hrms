package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.Allowance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AllowanceRepository extends JpaRepository<Allowance, Long>, JpaSpecificationExecutor<Allowance> {
    List<Allowance> findByCompanyId(Long companyId);
}
