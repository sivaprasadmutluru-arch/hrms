package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.Deduction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeductionRepository extends JpaRepository<Deduction, Long>, JpaSpecificationExecutor<Deduction> {
    List<Deduction> findByCompanyId(Long companyId);
}
