package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceLateComeEarlyOut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
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

    /** Count LATE_COME entries for an employee within a payroll period — used for late-come based deductions */
    @Query("SELECT COUNT(l) FROM AttendanceLateComeEarlyOut l " +
           "WHERE l.employee.id = :employeeId " +
           "AND l.type = com.example.demo.attendance.entity.AttendanceLateComeEarlyOut.EntryType.LATE_COME " +
           "AND l.attendance.attendanceDate BETWEEN :startDate AND :endDate")
    Long countLateComesForEmployee(@Param("employeeId") Long employeeId,
                                   @Param("startDate") LocalDate startDate,
                                   @Param("endDate") LocalDate endDate);

    /** Count EARLY_OUT entries for an employee within a payroll period — used for attendance summary in payslip */
    @Query("SELECT COUNT(l) FROM AttendanceLateComeEarlyOut l " +
           "WHERE l.employee.id = :employeeId " +
           "AND l.type = com.example.demo.attendance.entity.AttendanceLateComeEarlyOut.EntryType.EARLY_OUT " +
           "AND l.attendance.attendanceDate BETWEEN :startDate AND :endDate")
    Long countEarlyOutsForEmployee(@Param("employeeId") Long employeeId,
                                   @Param("startDate") LocalDate startDate,
                                   @Param("endDate") LocalDate endDate);
}
