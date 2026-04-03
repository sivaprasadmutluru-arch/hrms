package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.PayrollBatchGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface PayrollBatchGroupRepository extends JpaRepository<PayrollBatchGroup, Long>, JpaSpecificationExecutor<PayrollBatchGroup> {
}
