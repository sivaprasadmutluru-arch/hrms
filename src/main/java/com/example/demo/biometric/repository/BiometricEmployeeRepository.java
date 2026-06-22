package com.example.demo.biometric.repository;

import com.example.demo.biometric.entity.BiometricEmployee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BiometricEmployeeRepository extends JpaRepository<BiometricEmployee, Long> {
    List<BiometricEmployee> findByDeviceId(Long deviceId);
    List<BiometricEmployee> findByEmployeeId(Long employeeId);
    List<BiometricEmployee> findByDeviceIdAndIsActiveTrue(Long deviceId);
    Optional<BiometricEmployee> findByDeviceIdAndUserId(Long deviceId, String userId);
}
