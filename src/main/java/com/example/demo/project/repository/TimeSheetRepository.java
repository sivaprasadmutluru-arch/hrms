package com.example.demo.project.repository;

import com.example.demo.project.entity.TimeSheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface TimeSheetRepository extends JpaRepository<TimeSheet, Long>, JpaSpecificationExecutor<TimeSheet> {
    List<TimeSheet> findByEmployeeId(Long employeeId);
    List<TimeSheet> findByTaskId(Long taskId);
}
