package com.example.demo.biometric.repository;

import com.example.demo.biometric.entity.BiometricDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BiometricDeviceRepository extends JpaRepository<BiometricDevice, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select d from BiometricDevice d where d.serialNumber = :serial and d.isActive = true")
    Optional<BiometricDevice> lockActiveDevice(@org.springframework.data.repository.query.Param("serial") String serial);
    List<BiometricDevice> findByCompanyId(Long companyId);
    Optional<BiometricDevice> findBySerialNumberAndIsActiveTrue(String serialNumber);
}
