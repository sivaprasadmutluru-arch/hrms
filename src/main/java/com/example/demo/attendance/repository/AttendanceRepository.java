package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long>, JpaSpecificationExecutor<Attendance> {

    List<Attendance> findByCompanyId(Long companyId);
    List<Attendance> findByCompanyIdAndEmployeeIdIn(Long companyId, List<Long> employeeIds);
    List<Attendance> findByCompanyIdAndEmployeeIdInAndAttendanceDateBetween(Long companyId, List<Long> employeeIds, LocalDate from, LocalDate to);
    List<Attendance> findByEmployeeId(Long employeeId);
    List<Attendance> findByEmployeeIdAndAttendanceDateBetween(Long employeeId, LocalDate from, LocalDate to);
    Optional<Attendance> findByEmployeeIdAndAttendanceDate(Long employeeId, LocalDate date);
    List<Attendance> findByCompanyIdAndAttendanceDateBetween(Long companyId, LocalDate from, LocalDate to);
    List<Attendance> findByCompanyIdAndAttendanceDate(Long companyId, LocalDate date);
    List<Attendance> findByCompanyIdAndAttendanceDateAndCheckInIsNotNull(Long companyId, LocalDate date);
    List<Attendance> findByCompanyIdAndAttendanceDateAndCheckInIsNotNullAndCheckOutIsNull(Long companyId, LocalDate date);

    // ─── Payroll: Present Days ────────────────────────────────────────────────

    /**
     * Count all processed attendance records for an employee in a period.
     * REGULAR, IRREGULAR and REGULARISED all count as "present".
     */
    @Query("SELECT COUNT(a) FROM Attendance a " +
           "WHERE a.employee.id = :employeeId " +
           "AND a.attendanceDate BETWEEN :startDate AND :endDate " +
           "AND a.attendanceStatus IN ('REGULAR', 'IRREGULAR', 'REGULARISED')")
    Long countProcessedByEmployeeAndPeriod(@Param("employeeId") Long employeeId,
                                           @Param("startDate") LocalDate startDate,
                                           @Param("endDate") LocalDate endDate);

    /** Count processed attendance for a specific shift (allowance calculation). */
    @Query("SELECT COUNT(a) FROM Attendance a " +
           "WHERE a.employee.id = :employeeId " +
           "AND a.attendanceDate BETWEEN :startDate AND :endDate " +
           "AND a.attendanceStatus IN ('REGULAR', 'IRREGULAR', 'REGULARISED') " +
           "AND a.shift.id = :shiftId")
    Long countProcessedByEmployeeAndPeriodAndShift(@Param("employeeId") Long employeeId,
                                                   @Param("startDate") LocalDate startDate,
                                                   @Param("endDate") LocalDate endDate,
                                                   @Param("shiftId") Long shiftId);

    /** Count processed attendance for a specific work type (allowance calculation). */
    @Query("SELECT COUNT(a) FROM Attendance a " +
           "WHERE a.employee.id = :employeeId " +
           "AND a.attendanceDate BETWEEN :startDate AND :endDate " +
           "AND a.attendanceStatus IN ('REGULAR', 'IRREGULAR', 'REGULARISED') " +
           "AND a.workType.id = :workTypeId")
    Long countProcessedByEmployeeAndPeriodAndWorkType(@Param("employeeId") Long employeeId,
                                                      @Param("startDate") LocalDate startDate,
                                                      @Param("endDate") LocalDate endDate,
                                                      @Param("workTypeId") Long workTypeId);

    // ─── Payroll: Deduction Minutes ───────────────────────────────────────────

    /**
     * Sum deduction minutes for IRREGULAR attendance only.
     * REGULARISED records have deductionMinutes = 0, so they are naturally excluded,
     * but the explicit filter ensures correctness even if the field was not zeroed.
     */
    @Query("SELECT COALESCE(SUM(a.deductionMinutes), 0) FROM Attendance a " +
           "WHERE a.employee.id = :employeeId " +
           "AND a.attendanceDate BETWEEN :startDate AND :endDate " +
           "AND a.attendanceStatus = 'IRREGULAR'")
    Long sumDeductionMinutesByEmployeeAndPeriod(@Param("employeeId") Long employeeId,
                                                @Param("startDate") LocalDate startDate,
                                                @Param("endDate") LocalDate endDate);

    // ─── Payroll: Overtime Seconds ────────────────────────────────────────────

    /**
     * Sum overtime seconds for all processed records.
     * OT is auto-calculated; no manual approval gate needed.
     * Overtime is stored on the attendance record on checkout (or overridden by an approved OT request).
     */
    @Query("SELECT COALESCE(SUM(a.overtimeSecond), 0) FROM Attendance a " +
           "WHERE a.employee.id = :employeeId " +
           "AND a.attendanceDate BETWEEN :startDate AND :endDate " +
           "AND a.attendanceStatus IN ('REGULAR', 'IRREGULAR', 'REGULARISED')")
    Long sumOvertimeSecondsByEmployeeAndPeriod(@Param("employeeId") Long employeeId,
                                               @Param("startDate") LocalDate startDate,
                                               @Param("endDate") LocalDate endDate);

    // ─── Payroll: Hourly Wage (net worked seconds excluding OT) ──────────────

    /**
     * Sum (atWorkSecond - overtimeSecond) for processed attendances.
     * Used for hourly-wage employees: OT is billed separately.
     */
    @Query("SELECT COALESCE(SUM(a.atWorkSecond - COALESCE(a.overtimeSecond, 0)), 0) FROM Attendance a " +
           "WHERE a.employee.id = :employeeId " +
           "AND a.attendanceDate BETWEEN :startDate AND :endDate " +
           "AND a.attendanceStatus IN ('REGULAR', 'IRREGULAR', 'REGULARISED')")
    Long sumNetWorkedSecondsByEmployeeAndPeriod(@Param("employeeId") Long employeeId,
                                                @Param("startDate") LocalDate startDate,
                                                @Param("endDate") LocalDate endDate);

    // ─── Utilities ────────────────────────────────────────────────────────────

    /** Find all attendance records for an employee in a given month/year. */
    @Query("SELECT a FROM Attendance a " +
           "WHERE a.employee.id = :employeeId " +
           "AND FUNCTION('YEAR',  a.attendanceDate) = :year " +
           "AND FUNCTION('MONTH', a.attendanceDate) = :month")
    List<Attendance> findByEmployeeIdAndYearAndMonth(@Param("employeeId") Long employeeId,
                                                     @Param("year") int year,
                                                     @Param("month") int month);

    /** Raw count of all attendance records for an employee in a period (for present-days summary). */
    @Query("SELECT COUNT(a) FROM Attendance a " +
           "WHERE a.employee.id = :employeeId " +
           "AND a.attendanceDate BETWEEN :startDate AND :endDate")
    Long countAttendanceByEmployeeAndPeriod(@Param("employeeId") Long employeeId,
                                            @Param("startDate") LocalDate startDate,
                                            @Param("endDate") LocalDate endDate);

    /** Count attendance records for a company in a period (payroll pre-check). */
    @Query("SELECT COUNT(a) FROM Attendance a " +
           "WHERE a.company.id = :companyId " +
           "AND a.attendanceDate BETWEEN :startDate AND :endDate")
    Long countByCompanyAndPeriod(@Param("companyId") Long companyId,
                                 @Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate);
}
