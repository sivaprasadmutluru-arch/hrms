package com.example.demo.leave.repository;

import com.example.demo.leave.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long>, JpaSpecificationExecutor<LeaveRequest> {
    List<LeaveRequest> findByEmployeeId(Long employeeId);
    List<LeaveRequest> findByCompanyId(Long companyId);
    List<LeaveRequest> findByCompanyIdAndStatus(Long companyId, LeaveRequest.LeaveStatus status);
    List<LeaveRequest> findByEmployeeIdAndStatus(Long employeeId, LeaveRequest.LeaveStatus status);
    List<LeaveRequest> findByEmployeeIdAndStartDateBetween(Long employeeId, LocalDate from, LocalDate to);
    boolean existsByEmployeeIdAndLeaveTypeIdAndStartDateAndEndDateAndStatus(
            Long employeeId, Long leaveTypeId, LocalDate startDate, LocalDate endDate,
            LeaveRequest.LeaveStatus status);

    @Query("SELECT CASE WHEN COUNT(lr) > 0 THEN true ELSE false END FROM LeaveRequest lr " +
           "WHERE lr.employee.id = :employeeId AND lr.leaveType.id = :leaveTypeId " +
           "AND lr.status = com.example.demo.leave.entity.LeaveRequest.LeaveStatus.APPROVED " +
           "AND lr.startDate <= :endDate AND lr.endDate >= :startDate")
    boolean existsApprovedOverlap(@Param("employeeId") Long employeeId,
                                  @Param("leaveTypeId") Long leaveTypeId,
                                  @Param("startDate") LocalDate startDate,
                                  @Param("endDate") LocalDate endDate);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.company.id = :companyId " +
           "AND lr.status = com.example.demo.leave.entity.LeaveRequest.LeaveStatus.APPROVED " +
           "AND lr.startDate <= :endDate AND lr.endDate >= :startDate")
    List<LeaveRequest> findApprovedByCompanyAndDateRange(@Param("companyId") Long companyId,
                                                         @Param("startDate") LocalDate startDate,
                                                         @Param("endDate") LocalDate endDate);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.id = :employeeId " +
           "AND lr.status IN (com.example.demo.leave.entity.LeaveRequest.LeaveStatus.APPROVED, " +
           "                  com.example.demo.leave.entity.LeaveRequest.LeaveStatus.REQUESTED) " +
           "AND lr.startDate <= :endDate AND lr.endDate >= :startDate")
    List<LeaveRequest> findActiveOverlapping(@Param("employeeId") Long employeeId,
                                             @Param("startDate") LocalDate startDate,
                                             @Param("endDate") LocalDate endDate);

    @Query("SELECT lr.employee.id, lr.leaveType.id, COALESCE(SUM(lr.requestedDays), 0) " +
           "FROM LeaveRequest lr " +
           "WHERE lr.status = com.example.demo.leave.entity.LeaveRequest.LeaveStatus.APPROVED " +
           "AND lr.company.id = :companyId " +
           "GROUP BY lr.employee.id, lr.leaveType.id")
    List<Object[]> sumApprovedDaysByEmployeeAndLeaveType(@Param("companyId") Long companyId);

    @Query("SELECT lr.leaveType.id, COALESCE(SUM(lr.requestedDays), 0) " +
           "FROM LeaveRequest lr " +
           "WHERE lr.status = com.example.demo.leave.entity.LeaveRequest.LeaveStatus.APPROVED " +
           "AND lr.employee.id = :employeeId " +
           "GROUP BY lr.leaveType.id")
    List<Object[]> sumApprovedDaysByLeaveTypeForEmployee(@Param("employeeId") Long employeeId);

    @Query("SELECT COALESCE(SUM(lr.requestedDays), 0) " +
           "FROM LeaveRequest lr " +
           "WHERE lr.status = com.example.demo.leave.entity.LeaveRequest.LeaveStatus.APPROVED " +
           "AND lr.employee.id = :employeeId AND lr.leaveType.id = :leaveTypeId " +
           "AND YEAR(lr.startDate) = :year")
    Double sumApprovedDaysForAllocationYear(@Param("employeeId") Long employeeId,
                                             @Param("leaveTypeId") Long leaveTypeId,
                                             @Param("year") Integer year);

    @Query("SELECT COALESCE(SUM(lr.requestedDays), 0) FROM LeaveRequest lr " +
           "WHERE lr.status = com.example.demo.leave.entity.LeaveRequest.LeaveStatus.APPROVED " +
           "AND lr.employee.id = :employeeId AND lr.leaveType.id = :leaveTypeId " +
           "AND lr.startDate BETWEEN :startDate AND :endDate")
    Double sumApprovedDaysForPeriod(@Param("employeeId") Long employeeId,
                                    @Param("leaveTypeId") Long leaveTypeId,
                                    @Param("startDate") LocalDate startDate,
                                    @Param("endDate") LocalDate endDate);
}
