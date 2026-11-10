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

    @NotBlank(message="Enter the organization name")
    @jakarta.validation.constraints.Size(max=255,message="Organization name must be at most 255 characters")
    private String name;                  // Organization name, e.g. "Acme Corp"

    private com.example.demo.base.enums.OrganizationIndustry industryType = com.example.demo.base.enums.OrganizationIndustry.GENERAL;

    @jakarta.validation.constraints.NotNull(message="Organization size is required")
    private com.example.demo.base.enums.EmployeeRange employeeRange;

    private String slug;                  // Auto-generated if omitted

    @jakarta.validation.constraints.Email(message="Enter a valid contact email address")
    @jakarta.validation.constraints.Size(max=254,message="Email must be at most 254 characters")
    private String contactEmail;
    private String contactPhone;
    @jakarta.validation.constraints.Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Brand color must be a six-digit hex color")
    private String brandColor;

    private SubscriptionPlan subscriptionPlan;  // Compatibility only; creation always starts with legacy access
    private Integer maxBranches;               // Defaults to 5 if omitted

    // --- Head Office fields ---

    private String headOfficeName;        // Defaults to org name if omitted

    private String address;
    private String city;
    private String state;
    @NotBlank(message = "Country is required")
    @jakarta.validation.constraints.Size(max = 100, message = "Country must be at most 100 characters")
    private String country;
    private String zip;
    private String phone;
    @jakarta.validation.constraints.Email(message="Enter a valid head office email address")
    @jakarta.validation.constraints.Size(max=254,message="Email must be at most 254 characters")
    private String email;
    private String website;
    private String taxId;
    private String registrationNumber;
    private Integer branchLimit;          // Defaults to 5 if omitted

    // --- Enterprise Admin credentials (all optional — admin can be created later) ---

    private String adminUsername;
    @jakarta.validation.constraints.Email(message="Enter a valid administrator email address")
    @jakarta.validation.constraints.Size(max=254,message="Email must be at most 254 characters")
    private String adminEmail;
    @jakarta.validation.constraints.Size(min=6,max=100,message="Administrator password must contain 6 to 100 characters")
    private String adminPassword;
    private String adminFirstName;
    private String adminLastName;
}
