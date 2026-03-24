package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceLateComeEarlyOut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceLateComeEarlyOutRepository
        extends JpaRepository<AttendanceLateComeEarlyOut, Long>,
                JpaSpecificationExecutor<AttendanceLateComeEarlyOut> {

    List<AttendanceLateComeEarlyOut> findByAttendanceId(Long attendanceId);
    List<AttendanceLateComeEarlyOut> findByEmployeeId(Long employeeId);
    List<AttendanceLateComeEarlyOut> findByEmployeeIdAndType(Long employeeId, AttendanceLateComeEarlyOut.EntryType type);
}
