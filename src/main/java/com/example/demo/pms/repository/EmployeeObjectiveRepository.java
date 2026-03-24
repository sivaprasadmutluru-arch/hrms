package com.example.demo.pms.repository;

import com.example.demo.pms.entity.EmployeeObjective;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeObjectiveRepository extends JpaRepository<EmployeeObjective, Long>, JpaSpecificationExecutor<EmployeeObjective> {
    List<EmployeeObjective> findByEmployeeId(Long employeeId);
    List<EmployeeObjective> findByObjectiveId(Long objectiveId);
}
