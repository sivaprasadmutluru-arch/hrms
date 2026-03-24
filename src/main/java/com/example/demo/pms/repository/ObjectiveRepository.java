package com.example.demo.pms.repository;

import com.example.demo.pms.entity.Objective;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ObjectiveRepository extends JpaRepository<Objective, Long>, JpaSpecificationExecutor<Objective> {
    List<Objective> findByEmployeeId(Long employeeId);
    List<Objective> findByCycleId(Long cycleId);
    List<Objective> findByEmployeeIdAndCycleId(Long employeeId, Long cycleId);
}
