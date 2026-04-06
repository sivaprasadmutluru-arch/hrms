package com.example.demo.base.repository;

import com.example.demo.base.entity.CompanyDateTimeFormat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CompanyDateTimeFormatRepository extends JpaRepository<CompanyDateTimeFormat, Long> {
    Optional<CompanyDateTimeFormat> findByCompanyId(Long companyId);
}
