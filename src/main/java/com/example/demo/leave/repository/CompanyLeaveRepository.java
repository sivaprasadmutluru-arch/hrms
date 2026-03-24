package com.example.demo.leave.repository;

import com.example.demo.leave.entity.CompanyLeave;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompanyLeaveRepository extends JpaRepository<CompanyLeave, Long>, JpaSpecificationExecutor<CompanyLeave> {
    List<CompanyLeave> findByCompanyId(Long companyId);
}
