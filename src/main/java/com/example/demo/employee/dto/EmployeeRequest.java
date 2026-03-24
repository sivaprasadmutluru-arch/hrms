package com.example.demo.employee.dto;

import com.example.demo.employee.entity.Employee;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class EmployeeRequest {

    private String badgeId;

    @NotBlank
    private String firstName;

    private String lastName;
    private String phone;

    @Email
    private String email;

    private Employee.Gender gender;
    private LocalDate dateOfBirth;
    private Employee.MaritalStatus maritalStatus;
    private String nationality;
    private String countryOfBirth;
    private String placeOfBirth;
    private String permanentAddress;
    private String currentAddress;
    private String country;
    private String zip;
    private String emergencyContact;
    private String emergencyContactName;
    private String emergencyContactRelation;
    private LocalDate dateJoining;
    private Employee.EmployeeType employeeType;

    @NotNull
    private Long companyId;

    private Long departmentId;
    private Long jobPositionId;
    private Long jobRoleId;
    private Long workTypeId;
    private Long shiftId;
    private Long reportingManagerId;

    // null means no change (preserves existing value); explicit true/false sets it
    private Boolean isActive;
}
