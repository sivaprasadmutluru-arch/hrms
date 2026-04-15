package com.example.demo.base.dto;

import com.example.demo.base.enums.SubscriptionPlan;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Unified request for creating a new client organization + its Head Office in one shot.
 *
 * Org fields:         name, contactEmail, contactPhone, subscriptionPlan, maxBranches
 * Head Office fields: headOfficeName, address, city, state, country, zip, phone, email,
 *                     website, taxId, registrationNumber, branchLimit
 * Admin credentials:  adminUsername, adminEmail, adminPassword, adminFirstName, adminLastName
 */
@Getter
@Setter
public class CreateOrganizationRequest {

    // --- Organization fields ---

    @NotBlank
    private String name;                  // Organization name, e.g. "Acme Corp"

    private String slug;                  // Auto-generated if omitted

    private String contactEmail;
    private String contactPhone;

    private SubscriptionPlan subscriptionPlan;  // Defaults to STANDARD if omitted
    private Integer maxBranches;               // Defaults to 5 if omitted

    // --- Head Office fields ---

    private String headOfficeName;        // Defaults to org name if omitted

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
    private Integer branchLimit;          // Defaults to 5 if omitted

    // --- Enterprise Admin credentials (all optional — admin can be created later) ---

    private String adminUsername;
    private String adminEmail;
    private String adminPassword;
    private String adminFirstName;
    private String adminLastName;
}
