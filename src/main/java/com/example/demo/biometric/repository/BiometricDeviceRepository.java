package com.example.demo.biometric.repository;

import com.example.demo.biometric.entity.BiometricDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BiometricDeviceRepository extends JpaRepository<BiometricDevice, Long> {
    List<BiometricDevice> findByCompanyId(Long companyId);
}
