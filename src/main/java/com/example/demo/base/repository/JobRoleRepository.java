package com.example.demo.base.repository;

import com.example.demo.base.entity.JobRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRoleRepository extends JpaRepository<JobRole, Long>, JpaSpecificationExecutor<JobRole> {
    List<JobRole> findByCompanyId(Long companyId);
    List<JobRole> findByJobPositionId(Long jobPositionId);
}
