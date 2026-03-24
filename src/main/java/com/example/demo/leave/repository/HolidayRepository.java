package com.example.demo.leave.repository;

import com.example.demo.leave.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long>, JpaSpecificationExecutor<Holiday> {
    List<Holiday> findByCompanyId(Long companyId);

    @Query("SELECT h FROM Holiday h WHERE h.company.id = :companyId " +
           "AND ((h.startDate <= :endDate AND h.endDate >= :startDate))")
    List<Holiday> findByCompanyIdAndDateRange(Long companyId, LocalDate startDate, LocalDate endDate);
}
