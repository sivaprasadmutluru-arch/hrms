package com.example.demo.employee.repository;

import com.example.demo.employee.entity.Policy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PolicyRepository extends JpaRepository<Policy, Long>, JpaSpecificationExecutor<Policy> {
    List<Policy> findByVisibleToAllTrue();

    @Query("SELECT p FROM Policy p JOIN p.companies c WHERE c.id = :companyId")
    List<Policy> findByCompanyId(@Param("companyId") Long companyId);

    @Query("SELECT p FROM Policy p JOIN p.companies c WHERE c.id IN :companyIds")
    List<Policy> findByCompanyIdIn(@Param("companyIds") List<Long> companyIds);
}
