package com.example.demo.biometric.repository;

import com.example.demo.biometric.entity.BiometricEmployee;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BiometricEmployeeRepository extends JpaRepository<BiometricEmployee, Long> {
    @Override
    @EntityGraph(attributePaths = {"employee", "device"})
    List<BiometricEmployee> findAll();

    @EntityGraph(attributePaths = {"employee", "device"})
    List<BiometricEmployee> findByDeviceId(Long deviceId);

    @EntityGraph(attributePaths = {"employee", "device"})
    List<BiometricEmployee> findByEmployeeId(Long employeeId);
    List<BiometricEmployee> findByDeviceIdAndIsActiveTrue(Long deviceId);
    List<BiometricEmployee> findByUserIdAndIsActiveTrue(String userId);
    Optional<BiometricEmployee> findByDeviceIdAndUserId(Long deviceId, String userId);
}
