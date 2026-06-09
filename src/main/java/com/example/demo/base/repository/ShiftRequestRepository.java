package com.example.demo.base.repository;

import com.example.demo.base.entity.ShiftRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ShiftRequestRepository extends JpaRepository<ShiftRequest, Long>, JpaSpecificationExecutor<ShiftRequest> {

    List<ShiftRequest> findByCompanyId(Long companyId);

    /**
     * Finds approved shift requests whose effective date is today and have not yet been applied.
     * Used by the switchShift scheduler.
     */
    @Query("SELECT sr FROM ShiftRequest sr WHERE sr.status = 'APPROVED' " +
           "AND sr.requestedDate = :today " +
           "AND (sr.shiftChanged IS NULL OR sr.shiftChanged = false) " +
           "AND (sr.isActive IS NULL OR sr.isActive = true)")
    List<ShiftRequest> findApprovedPendingSwitch(@Param("today") LocalDate today);

    /**
     * Finds approved temporary requests that have expired (requestedTill < today) and are still active.
     * Used by the undoShift scheduler to revert employee shifts.
     */
    @Query("SELECT sr FROM ShiftRequest sr WHERE sr.status = 'APPROVED' " +
           "AND sr.isPermanent = false " +
           "AND sr.requestedTill < :today " +
           "AND sr.shiftChanged = true " +
           "AND sr.isActive = true")
    List<ShiftRequest> findExpiredActiveShiftRequests(@Param("today") LocalDate today);

    /**
     * Counts approved requests for an employee whose date range overlaps with [start, end].
     * Used to prevent duplicate approved requests for the same period.
     * Range overlap condition: existingStart <= end AND (existingTill IS NULL OR existingTill >= start)
     */
    @Query("SELECT COUNT(sr) FROM ShiftRequest sr WHERE sr.employee.id = :employeeId " +
           "AND sr.status = 'APPROVED' AND (:excludeId IS NULL OR sr.id != :excludeId) " +
           "AND sr.requestedDate <= :end " +
           "AND (sr.requestedTill IS NULL OR sr.requestedTill >= :start)")
    long countOverlappingApproved(@Param("employeeId") Long employeeId,
                                  @Param("start") LocalDate start,
                                  @Param("end") LocalDate end,
                                  @Param("excludeId") Long excludeId);
}
