package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceRequestComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface AttendanceRequestCommentRepository extends JpaRepository<AttendanceRequestComment, Long>, JpaSpecificationExecutor<AttendanceRequestComment> {
    List<AttendanceRequestComment> findByAttendanceId(Long attendanceId);
}
