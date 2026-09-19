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
    @Column(nullable = false) private String serialNumber;
    @Column(nullable = false) private String deviceUserId;
    @Column(nullable = false) private LocalDateTime deviceTime;
    @Column(nullable = false) private Integer deviceStatus;
    @Column(nullable = false, length = 32) private String processingState;
    private Long employeeId;
    @Column(length = 200) private String detail;
}
