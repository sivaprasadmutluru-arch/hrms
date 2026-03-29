package com.example.demo.base.repository;

import com.example.demo.base.entity.BiometricAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BiometricAttendanceRepository extends JpaRepository<BiometricAttendance, Long> {
    Optional<BiometricAttendance> findByCompanyId(Long companyId);
}
