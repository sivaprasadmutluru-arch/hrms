package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceRegularisationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRegularisationRequestRepository
        extends JpaRepository<AttendanceRegularisationRequest, Long>,
                JpaSpecificationExecutor<AttendanceRegularisationRequest> {

    List<AttendanceRegularisationRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    List<AttendanceRegularisationRequest> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    Optional<AttendanceRegularisationRequest> findByAttendanceIdAndStatus(
            Long attendanceId, AttendanceRegularisationRequest.RequestStatus status);

    List<AttendanceRegularisationRequest> findByAttendanceId(Long attendanceId);

    /** Requests awaiting the given manager's approval. */
    @Query("SELECT r FROM AttendanceRegularisationRequest r " +
           "WHERE r.manager.id = :managerId " +
           "AND r.status = 'PENDING_MANAGER' " +
           "ORDER BY r.createdAt ASC")
    List<AttendanceRegularisationRequest> findPendingForManager(@Param("managerId") Long managerId);

    /** Requests awaiting HR verification (company-scoped). Includes PENDING_MANAGER so HR can approve directly. */
    @Query("SELECT r FROM AttendanceRegularisationRequest r " +
           "WHERE r.company.id = :companyId " +
           "AND r.status IN ('PENDING_MANAGER', 'PENDING_HR') " +
           "ORDER BY r.createdAt ASC")
    List<AttendanceRegularisationRequest> findPendingForHR(@Param("companyId") Long companyId);

    /** Count pending requests for dashboard badges. */
    @Query("SELECT COUNT(r) FROM AttendanceRegularisationRequest r " +
           "WHERE r.manager.id = :managerId AND r.status = 'PENDING_MANAGER'")
    long countPendingForManager(@Param("managerId") Long managerId);

    @Query("SELECT COUNT(r) FROM AttendanceRegularisationRequest r " +
           "WHERE r.company.id = :companyId AND r.status IN ('PENDING_MANAGER', 'PENDING_HR')")
    long countPendingForHR(@Param("companyId") Long companyId);
}
