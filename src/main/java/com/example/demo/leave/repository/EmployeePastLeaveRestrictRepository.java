package com.example.demo.leave.repository;

import com.example.demo.leave.entity.EmployeePastLeaveRestrict;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmployeePastLeaveRestrictRepository extends JpaRepository<EmployeePastLeaveRestrict, Long>, JpaSpecificationExecutor<EmployeePastLeaveRestrict> {
    Optional<EmployeePastLeaveRestrict> findByCompanyId(Long companyId);
}
