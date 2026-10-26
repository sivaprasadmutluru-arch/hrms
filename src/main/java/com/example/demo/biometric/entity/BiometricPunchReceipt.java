package com.example.demo.biometric.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "biometric_punch_receipts", uniqueConstraints = @UniqueConstraint(columnNames = "fingerprint"))
@Getter
@Setter
public class BiometricPunchReceipt extends BaseEntity {
    @Column(nullable = false, length = 64) private String fingerprint;
    @Column(name = "serial_number", nullable = false) private String serialNumber;
    @Column(name = "device_user_id", nullable = false) private String deviceUserId;
    @Column(name = "device_time", nullable = false) private LocalDateTime deviceTime;
    @Column(name = "device_status", nullable = false) private Integer deviceStatus;
    @Column(name = "processing_state", nullable = false, length = 32) private String processingState;
    @Column(name = "employee_id") private Long employeeId;
    @Column(length = 200) private String detail;
}
