package com.example.demo.facedetection.repository;

import com.example.demo.facedetection.entity.EmployeeFaceDetection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmployeeFaceDetectionRepository extends JpaRepository<EmployeeFaceDetection, Long> {
    Optional<EmployeeFaceDetection> findByEmployeeId(Long employeeId);
}
