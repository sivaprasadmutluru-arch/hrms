package com.example.demo.attendance.repository;

import com.example.demo.attendance.entity.AttendanceRequestFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AttendanceRequestFileRepository extends JpaRepository<AttendanceRequestFile, Long>, JpaSpecificationExecutor<AttendanceRequestFile> {
}
