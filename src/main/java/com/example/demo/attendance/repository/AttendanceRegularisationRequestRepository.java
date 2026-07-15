package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceRegularisationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRegularisationRequestRepository
        extends JpaRepository<AttendanceRegularisationRequest, Long>,
                JpaSpecificationExecutor<AttendanceRegularisationRequest> {

    List<AttendanceRegularisationRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    /** Duplicate-pending check for requests with no backing attendance row yet (Absent/Leave/Holiday/WeekOff). */
    boolean existsByEmployeeIdAndRequestDateAndStatus(
            Long employeeId, LocalDate requestDate, AttendanceRegularisationRequest.RequestStatus status);

    List<AttendanceRegularisationRequest> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    Optional<AttendanceRegularisationRequest> findByAttendanceIdAndStatus(
            Long attendanceId, AttendanceRegularisationRequest.RequestStatus status);

    List<AttendanceRegularisationRequest> findByAttendanceId(Long attendanceId);

    /** Requests awaiting admin/HR manager approval (company-scoped). */
    @Query("SELECT r FROM AttendanceRegularisationRequest r " +
           "WHERE r.company.id = :companyId " +
           "AND r.status = 'PENDING' " +
           "ORDER BY r.createdAt ASC")
    List<AttendanceRegularisationRequest> findPendingApproval(@Param("companyId") Long companyId);

    /** Count pending requests for dashboard badges. */
    @Query("SELECT COUNT(r) FROM AttendanceRegularisationRequest r " +
           "WHERE r.company.id = :companyId AND r.status = 'PENDING'")
    long countPendingApproval(@Param("companyId") Long companyId);

    /** Pending requests with no backing attendance row yet, for the full attendance view's Absent/Leave/Holiday/WeekOff rows. */
    @Query("SELECT r FROM AttendanceRegularisationRequest r " +
           "WHERE r.attendance IS NULL AND r.status = 'PENDING' " +
           "AND r.employee.id IN :employeeIds AND r.requestDate BETWEEN :from AND :to")
    List<AttendanceRegularisationRequest> findPendingNoAttendanceRequests(
            @Param("employeeIds") List<Long> employeeIds, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
