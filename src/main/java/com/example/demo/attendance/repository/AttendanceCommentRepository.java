package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface AttendanceCommentRepository extends JpaRepository<AttendanceComment, Long>, JpaSpecificationExecutor<AttendanceComment> {
    List<AttendanceComment> findByAttendanceId(Long attendanceId);
}
