package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceLateComeEarlyOut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface AttendanceLateComeEarlyOutRepository
        extends JpaRepository<AttendanceLateComeEarlyOut, Long>,
                JpaSpecificationExecutor<AttendanceLateComeEarlyOut> {

    List<AttendanceLateComeEarlyOut> findByAttendanceId(Long attendanceId);
    List<AttendanceLateComeEarlyOut> findByEmployeeId(Long employeeId);
    List<AttendanceLateComeEarlyOut> findByEmployeeIdAndType(Long employeeId, AttendanceLateComeEarlyOut.EntryType type);
    List<AttendanceLateComeEarlyOut> findByAttendanceIdIn(Collection<Long> attendanceIds);

    // ─── Payroll: Count (excluding regularised) ───────────────────────────────

    /**
     * Count LATE_COME entries for an employee in a period.
     * Excludes entries where the linked attendance has been regularised.
     * Used for payslip summary display (not for deduction amount — that uses minutes).
     */
    @Query("SELECT COUNT(l) FROM AttendanceLateComeEarlyOut l " +
           "WHERE l.employee.id = :employeeId " +
           "AND l.type = com.example.demo.attendance.entity.AttendanceLateComeEarlyOut.EntryType.LATE_COME " +
           "AND l.attendance.attendanceDate BETWEEN :startDate AND :endDate " +
           "AND (l.isRegularised IS NULL OR l.isRegularised = false)")
    Long countLateComesForEmployee(@Param("employeeId") Long employeeId,
                                   @Param("startDate") LocalDate startDate,
                                   @Param("endDate") LocalDate endDate);

    /**
     * Count EARLY_OUT entries for an employee in a period (excluding regularised).
     */
    @Query("SELECT COUNT(l) FROM AttendanceLateComeEarlyOut l " +
           "WHERE l.employee.id = :employeeId " +
           "AND l.type = com.example.demo.attendance.entity.AttendanceLateComeEarlyOut.EntryType.EARLY_OUT " +
           "AND l.attendance.attendanceDate BETWEEN :startDate AND :endDate " +
           "AND (l.isRegularised IS NULL OR l.isRegularised = false)")
    Long countEarlyOutsForEmployee(@Param("employeeId") Long employeeId,
                                   @Param("startDate") LocalDate startDate,
                                   @Param("endDate") LocalDate endDate);

    // ─── Payroll: Sum seconds (excluding regularised) ─────────────────────────

    @Query("SELECT COALESCE(SUM(l.lateComeSecond), 0) FROM AttendanceLateComeEarlyOut l " +
           "WHERE l.employee.id = :employeeId " +
           "AND l.type = com.example.demo.attendance.entity.AttendanceLateComeEarlyOut.EntryType.LATE_COME " +
           "AND l.attendance.attendanceDate BETWEEN :startDate AND :endDate " +
           "AND (l.isRegularised IS NULL OR l.isRegularised = false)")
    Long sumLateSecondsForEmployee(@Param("employeeId") Long employeeId,
                                   @Param("startDate") LocalDate startDate,
                                   @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(l.earlyOutSecond), 0) FROM AttendanceLateComeEarlyOut l " +
           "WHERE l.employee.id = :employeeId " +
           "AND l.type = com.example.demo.attendance.entity.AttendanceLateComeEarlyOut.EntryType.EARLY_OUT " +
           "AND l.attendance.attendanceDate BETWEEN :startDate AND :endDate " +
           "AND (l.isRegularised IS NULL OR l.isRegularised = false)")
    Long sumEarlyOutSecondsForEmployee(@Param("employeeId") Long employeeId,
                                       @Param("startDate") LocalDate startDate,
                                       @Param("endDate") LocalDate endDate);

    // ─── Regularisation ───────────────────────────────────────────────────────

    /** Mark all late/early records for an attendance as regularised (called on request approval). */
    @Modifying
    @Query("UPDATE AttendanceLateComeEarlyOut l SET l.isRegularised = true " +
           "WHERE l.attendance.id = :attendanceId")
    void markAllAsRegularisedByAttendanceId(@Param("attendanceId") Long attendanceId);
}
