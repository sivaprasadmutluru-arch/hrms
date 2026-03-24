package com.example.demo.pms.repository;

import com.example.demo.pms.entity.PerformanceCycle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PerformanceCycleRepository extends JpaRepository<PerformanceCycle, Long>, JpaSpecificationExecutor<PerformanceCycle> {
    List<PerformanceCycle> findByCompanyId(Long companyId);
    List<PerformanceCycle> findByCompanyIdAndStatus(Long companyId, PerformanceCycle.CycleStatus status);
}
