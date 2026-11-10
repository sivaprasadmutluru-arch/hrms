package com.example.demo.employee.dto;

import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.employee.entity.Employee;
import com.example.demo.payroll.entity.Contract;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class EmployeeRequest {

    private String badgeId;

    @NotBlank(message="Enter the employee’s first name")
    @jakarta.validation.constraints.Size(max=255,message="First name must be at most 255 characters")
    private String firstName;

    private String lastName;
    private String phone;

    @Email(message="Enter a valid email address")
    @jakarta.validation.constraints.Size(max=254,message="Email must be at most 254 characters")
    private String email;

    private Employee.Gender gender;
    @jakarta.validation.constraints.PastOrPresent(message="Date of birth cannot be in the future")
    private LocalDate dateOfBirth;
    private Employee.MaritalStatus maritalStatus;
    private String nationality;
    private String countryOfBirth;
    private String placeOfBirth;
    private String permanentAddress;
    private String currentAddress;
    private String country;
    private String state;
    private String city;
    private String zip;
    @Email(message="Enter a valid work email address")
    private String workEmail;
    private String workPhone;
    private String qualification;
    @jakarta.validation.constraints.Min(value=0,message="Experience cannot be negative")
    private Integer experience;
    @jakarta.validation.constraints.Min(value=0,message="Number of children cannot be negative")
    private Integer children;
    private String emergencyContact;
    private String emergencyContactName;
    private String emergencyContactRelation;
    private LocalDate dateJoining;
    private Employee.EmployeeType employeeType;

    // Optional on update (preserves existing employee company)
    private Long companyId;

    private Long departmentId;
    private Long jobPositionId;
    private Long jobRoleId;
    private Long workTypeId;
    private Long shiftId;
    private Long reportingManagerId;

    // null means no change (preserves existing value); explicit true/false sets it
    private Boolean isActive;

    // Optional: assign a role during employee creation (ignored on update)
    private Role.RoleName role;
    private UserRole.AccessScope accessScope;

    // Login credentials for the auto-created user account (ignored on update)
    private String password;

    // Contract fields for auto-generated contract on employee creation
    @jakarta.validation.constraints.DecimalMin(value="0",message="Basic pay cannot be negative")
    @jakarta.validation.constraints.Digits(integer=10,fraction=2,message="Basic pay must have at most 10 whole-number digits and 2 decimal places")
    private BigDecimal basicPay;
    @jakarta.validation.constraints.DecimalMin(value="0",message="Housing allowance cannot be negative")
    @jakarta.validation.constraints.Digits(integer=10,fraction=2,message="Housing allowance must have at most 10 whole-number digits and 2 decimal places")
    private BigDecimal housingAllowance;
    @jakarta.validation.constraints.DecimalMin(value="0",message="Transport allowance cannot be negative")
    @jakarta.validation.constraints.Digits(integer=10,fraction=2,message="Transport allowance must have at most 10 whole-number digits and 2 decimal places")
    private BigDecimal transportAllowance;
    @jakarta.validation.constraints.DecimalMin(value="0",message="Other allowance cannot be negative")
    @jakarta.validation.constraints.Digits(integer=10,fraction=2,message="Other allowance must have at most 10 whole-number digits and 2 decimal places")
    private BigDecimal otherAllowance;
    @jakarta.validation.constraints.DecimalMin(value="0",message="Total salary cannot be negative")
    @jakarta.validation.constraints.Digits(integer=10,fraction=2,message="Total salary must have at most 10 whole-number digits and 2 decimal places")
    private BigDecimal totalSalary;
    @jakarta.validation.constraints.DecimalMin(value="0",message="Salary per hour cannot be negative")
    @jakarta.validation.constraints.Digits(integer=8,fraction=4,message="Salary per hour must have at most 8 whole-number digits and 4 decimal places")
    private BigDecimal salaryPerHour;
    private LocalDate contractEndDate;
    private Contract.WageType wageType;
}
