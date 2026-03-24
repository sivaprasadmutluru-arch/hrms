package com.example.demo.hrpolicy.repository;

import com.example.demo.hrpolicy.entity.HrPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HrPolicyRepository extends JpaRepository<HrPolicy, Long>, JpaSpecificationExecutor<HrPolicy> {
    List<HrPolicy> findByCompanyId(Long companyId);
    List<HrPolicy> findByIsOrganizationWideTrue();
    List<HrPolicy> findByCompanyIdOrIsOrganizationWideTrue(Long companyId);
}
