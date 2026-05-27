package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.FilingStatus;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FilingStatusRepository extends JpaRepository<FilingStatus, Long>, JpaSpecificationExecutor<FilingStatus> {

    @Cacheable(value = "filingStatuses", key = "#companyId")
    List<FilingStatus> findByCompanyId(Long companyId);

    @Override
    @Cacheable(value = "filingStatusById")
    @NonNull Optional<FilingStatus> findById(@NonNull Long id);
}
