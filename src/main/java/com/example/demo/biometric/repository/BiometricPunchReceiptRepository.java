package com.example.demo.biometric.repository;

import com.example.demo.biometric.entity.BiometricPunchReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BiometricPunchReceiptRepository extends JpaRepository<BiometricPunchReceipt, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<BiometricPunchReceipt> {
    Optional<BiometricPunchReceipt> findByFingerprint(String fingerprint);
}
