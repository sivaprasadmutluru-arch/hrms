package com.example.demo.employee.entity;

import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "employee_bank_details")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EmployeeBankDetails extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false, unique = true)
    private Employee employee;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "account_number", unique = true)
    private String accountNumber;

    @Column(name = "branch")
    private String branch;

    @Column(name = "country")
    private String country;

    @Column(name = "state")
    private String state;

    @Column(name = "city")
    private String city;

    @Column(name = "ifsc_code")
    private String ifscCode;

    @Column(name = "swift_code")
    private String swiftCode;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;
}
