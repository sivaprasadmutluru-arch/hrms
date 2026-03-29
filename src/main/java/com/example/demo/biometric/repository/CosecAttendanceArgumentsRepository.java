package com.example.demo.biometric.repository;

import com.example.demo.biometric.entity.CosecAttendanceArguments;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CosecAttendanceArgumentsRepository extends JpaRepository<CosecAttendanceArguments, Long> {
    Optional<CosecAttendanceArguments> findFirstByDeviceId(Long deviceId);
}
