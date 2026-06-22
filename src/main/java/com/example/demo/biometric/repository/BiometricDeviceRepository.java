package com.example.demo.biometric.repository;

import com.example.demo.biometric.entity.BiometricDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BiometricDeviceRepository extends JpaRepository<BiometricDevice, Long> {
    List<BiometricDevice> findByCompanyId(Long companyId);
    Optional<BiometricDevice> findBySerialNumberAndIsActiveTrue(String serialNumber);
}
