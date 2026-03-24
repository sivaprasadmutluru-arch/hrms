package com.example.demo.employee.repository;

import com.example.demo.employee.entity.PolicyMultipleFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface PolicyMultipleFileRepository extends JpaRepository<PolicyMultipleFile, Long>, JpaSpecificationExecutor<PolicyMultipleFile> {
    List<PolicyMultipleFile> findByPolicyId(Long policyId);
}
