package com.example.demo.report.repository;

import com.example.demo.report.entity.GeneratedReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface GeneratedReportRepository
        extends JpaRepository<GeneratedReport, Long>, JpaSpecificationExecutor<GeneratedReport> {
}
