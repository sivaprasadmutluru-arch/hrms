package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.WorkRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WorkRecordRepository
        extends JpaRepository<WorkRecord, Long>,
                JpaSpecificationExecutor<WorkRecord> {

    List<WorkRecord> findByEmployeeId(Long employeeId);
    List<WorkRecord> findByEmployeeIdAndDateBetween(Long employeeId, LocalDate from, LocalDate to);
    List<WorkRecord> findByEmployeeIdAndDate(Long employeeId, LocalDate date);
    Page<WorkRecord> findByCompanyId(Long companyId, Pageable pageable);
}
