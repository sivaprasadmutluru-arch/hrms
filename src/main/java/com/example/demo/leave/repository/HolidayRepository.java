package com.example.demo.leave.repository;

import com.example.demo.leave.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long>, JpaSpecificationExecutor<Holiday> {
    List<Holiday> findByCompanyId(Long companyId);

    Optional<Holiday> findByIdAndCompanyIdIn(Long id, List<Long> companyIds);

    @Query("SELECT h FROM Holiday h WHERE h.company.id = :companyId " +
           "AND ((h.startDate <= :endDate AND h.endDate >= :startDate))")
    List<Holiday> findByCompanyIdAndDateRange(Long companyId, LocalDate startDate, LocalDate endDate);

    Optional<Holiday> findFirstByCompanyIdAndStartDateGreaterThanEqualOrderByStartDateAsc(Long companyId, LocalDate from);

    @Query("SELECT h FROM Holiday h WHERE h.company.id = :companyId " +
           "AND lower(trim(h.name)) = lower(trim(:name)) " +
           "AND h.startDate = :startDate " +
           "AND ((:endDate IS NULL AND h.endDate IS NULL) OR h.endDate = :endDate) " +
           "AND coalesce(h.recurring, false) = :recurring")
    Optional<Holiday> findDuplicateForImport(@Param("companyId") Long companyId,
                                              @Param("name") String name,
                                              @Param("startDate") LocalDate startDate,
                                              @Param("endDate") LocalDate endDate,
                                              @Param("recurring") boolean recurring);
}
