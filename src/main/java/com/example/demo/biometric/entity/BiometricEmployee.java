package com.example.demo.biometric.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "biometric_employees")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class BiometricEmployee extends BaseEntity {

    @Column(name = "uid")
    private Integer uid;

    @Column(name = "ref_user_id")
    private Integer refUserId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "dahua_card_no")
    private String dahuaCardNo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    private BiometricDevice device;
}
