package com.example.demo.facedetection.repository;

import com.example.demo.facedetection.entity.FaceDetection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FaceDetectionRepository extends JpaRepository<FaceDetection, Long> {
    Optional<FaceDetection> findByCompanyId(Long companyId);
}
