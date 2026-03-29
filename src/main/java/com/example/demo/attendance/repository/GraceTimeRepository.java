package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.GraceTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface GraceTimeRepository extends JpaRepository<GraceTime, Long>, JpaSpecificationExecutor<GraceTime> {
    Optional<GraceTime> findFirstByCompanyIdAndIsDefaultTrue(Long companyId);
}
