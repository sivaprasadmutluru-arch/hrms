package com.example.demo.biometric.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "biometric_devices")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class BiometricDevice extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "machine_type", nullable = false)
    private MachineType machineType;

    @Column(name = "machine_ip")
    private String machineIp;

    @Column(name = "port")
    private Integer port;

    @JsonIgnore
    @Column(name = "zk_password")
    private String zkPassword;

    @JsonIgnore
    @Column(name = "bio_username")
    private String bioUsername;

    @JsonIgnore
    @Column(name = "bio_password")
    private String bioPassword;

    @Column(name = "anviz_request_id")
    private String anvizRequestId;

    @Column(name = "api_url")
    private String apiUrl;

    @JsonIgnore
    @Column(name = "api_key")
    private String apiKey;

    @JsonIgnore
    @Column(name = "api_secret")
    private String apiSecret;

    @JsonIgnore
    @Column(name = "api_token", length = 500)
    private String apiToken;

    @Column(name = "api_expires")
    private String apiExpires;

    @Column(name = "is_live", nullable = false)
    private boolean isLive = false;

    @Column(name = "is_scheduler", nullable = false)
    private boolean isScheduler = false;

    @Column(name = "scheduler_duration")
    private String schedulerDuration;

    @Column(name = "last_fetch_date")
    private LocalDate lastFetchDate;

    @Column(name = "last_fetch_time")
    private LocalTime lastFetchTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "device_direction", nullable = false)
    private DeviceDirection deviceDirection = DeviceDirection.SYSTEM;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    public enum MachineType {
        ZK, ANVIZ, COSEC, DAHUA, ETIMEOFFICE
    }

    public enum DeviceDirection {
        IN, OUT, ALTERNATE, SYSTEM
    }
}
