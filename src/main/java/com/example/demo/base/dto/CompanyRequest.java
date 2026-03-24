package com.example.demo.base.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Used when creating a Head Office or a Branch company.
 * The endpoint determines whether it's a Head Office or Branch — not this DTO.
 */
@Getter
@Setter
public class CompanyRequest {

    @NotBlank
    private String name;

    private String address;
    private String city;
    private String state;
    private String country;
    private String zip;
    private String phone;
    private String email;
    private String website;
    private String taxId;
    private String registrationNumber;

    // Only relevant when creating a Head Office — links it to a Prabha Tech organization
    private Long organizationId;

    // Head Office can override the default branch limit (max branches allowed)
    // Leave null to keep the default of 5
    private Integer branchLimit;
}
