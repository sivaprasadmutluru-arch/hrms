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
    List<Attendance> findByEmployeeId(Long employeeId);
    List<Attendance> findByEmployeeIdAndAttendanceDateBetween(Long employeeId, LocalDate from, LocalDate to);
    Optional<Attendance> findByEmployeeIdAndAttendanceDate(Long employeeId, LocalDate date);
    List<Attendance> findByCompanyIdAndAttendanceDateBetween(Long companyId, LocalDate from, LocalDate to);
    List<Attendance> findByCompanyIdAndAttendanceDate(Long companyId, LocalDate date);
    List<Attendance> findByCompanyIdAndAttendanceDateAndCheckInIsNotNull(Long companyId, LocalDate date);
    List<Attendance> findByCompanyIdAndAttendanceDateAndCheckInIsNotNullAndCheckOutIsNull(Long companyId, LocalDate date);

    /** Count validated attendances for an employee in a date range */
    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId AND a.attendanceDate BETWEEN :startDate AND :endDate AND a.attendanceValidated = 'APPROVED'")
    Long countValidatedByEmployeeAndPeriod(@Param("employeeId") Long employeeId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /** Count validated attendances for a specific shift */
    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId AND a.attendanceDate BETWEEN :startDate AND :endDate AND a.attendanceValidated = 'APPROVED' AND a.shift.id = :shiftId")
    Long countValidatedByEmployeeAndPeriodAndShift(@Param("employeeId") Long employeeId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate, @Param("shiftId") Long shiftId);

    /** Count validated attendances for a specific work type */
    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.employee.id = :employeeId AND a.attendanceDate BETWEEN :startDate AND :endDate AND a.attendanceValidated = 'APPROVED' AND a.workType.id = :workTypeId")
    Long countValidatedByEmployeeAndPeriodAndWorkType(@Param("employeeId") Long employeeId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate, @Param("workTypeId") Long workTypeId);

    /** Sum approved overtime seconds for an employee in a date range */
    @Query("SELECT COALESCE(SUM(a.approvedOvertimeSecond), 0) FROM Attendance a WHERE a.employee.id = :employeeId AND a.attendanceDate BETWEEN :startDate AND :endDate AND a.attendanceOvertimeApprove = true AND a.attendanceValidated = 'APPROVED'")
    Long sumApprovedOvertimeSecondsByEmployeeAndPeriod(@Param("employeeId") Long employeeId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /** Sum (atWorkSecond - overtimeSecond) for validated attendances — used for hourly basic pay (mirrors GCP hourly_computation) */
    @Query("SELECT COALESCE(SUM(a.atWorkSecond - COALESCE(a.overtimeSecond, 0)), 0) FROM Attendance a WHERE a.employee.id = :employeeId AND a.attendanceDate BETWEEN :startDate AND :endDate AND a.attendanceValidated = 'APPROVED'")
    Long sumNetWorkedSecondsByEmployeeAndPeriod(@Param("employeeId") Long employeeId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /** Find all attendance records for an employee in a given calendar month/year — used for overtime approval propagation */
    @Query("SELECT a FROM Attendance a WHERE a.employee.id = :employeeId AND FUNCTION('YEAR', a.attendanceDate) = :year AND FUNCTION('MONTH', a.attendanceDate) = :month")
    List<Attendance> findByEmployeeIdAndYearAndMonth(@Param("employeeId") Long employeeId, @Param("year") int year, @Param("month") int month);
}
