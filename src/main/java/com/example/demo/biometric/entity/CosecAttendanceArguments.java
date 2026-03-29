package com.example.demo.biometric.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "cosec_attendance_arguments")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CosecAttendanceArguments extends BaseEntity {

    @Column(name = "last_fetch_roll_ovr_count")
    private String lastFetchRollOvrCount;

    @Column(name = "last_fetch_seq_number")
    private String lastFetchSeqNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    private BiometricDevice device;
}
