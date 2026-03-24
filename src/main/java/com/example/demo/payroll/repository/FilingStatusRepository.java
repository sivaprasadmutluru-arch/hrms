package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.FilingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FilingStatusRepository extends JpaRepository<FilingStatus, Long>, JpaSpecificationExecutor<FilingStatus> {
    List<FilingStatus> findByCompanyId(Long companyId);
}
