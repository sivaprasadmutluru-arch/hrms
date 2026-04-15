package com.example.demo.employee.dto;

import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class EmployeeResponse {

    private Long id;
    private String badgeId;
    private String firstName;
    private String lastName;
    private String fullName;
    private String phone;
    private String email;
    private String gender;
    private LocalDate dateOfBirth;
    private String maritalStatus;
    private String nationality;
    private String countryOfBirth;
    private String placeOfBirth;
    private String permanentAddress;
    private String currentAddress;
    private String country;
    private String state;
    private String city;
    private String zip;
    private String workEmail;
    private String workPhone;
    private String qualification;
    private Integer experience;
    private Integer children;
    private String emergencyContact;
    private String emergencyContactName;
    private String emergencyContactRelation;
    private LocalDate dateJoining;
    private String employeeType;
    private String photoPath;
    @JsonProperty("isActive")
    private boolean isActive;
    private LocalDateTime createdAt;

    private Long companyId;
    private String companyName;
    private String organizationName;
    private Long departmentId;
    private String departmentName;
    private Long jobPositionId;
    private String jobPositionName;
    private Long jobRoleId;
    private String jobRoleName;
    private Long workTypeId;
    private String workTypeName;
    private Long shiftId;
    private String shiftName;
    private Long reportingManagerId;
    private String reportingManagerName;

    private String currencySymbol = "$";
    private String currencyPosition = "PREFIX";

    public static EmployeeResponse from(Employee e) {
        EmployeeResponse r = new EmployeeResponse();
        r.setId(e.getId());
        r.setBadgeId(e.getBadgeId());
        r.setFirstName(e.getFirstName());
        r.setLastName(e.getLastName());
        r.setFullName((e.getFirstName() != null ? e.getFirstName() : "") +
                (e.getLastName() != null ? " " + e.getLastName() : ""));
        r.setPhone(e.getPhone());
        r.setEmail(e.getEmail());
        r.setGender(e.getGender() != null ? e.getGender().name() : null);
        r.setDateOfBirth(e.getDateOfBirth());
        r.setMaritalStatus(e.getMaritalStatus() != null ? e.getMaritalStatus().name() : null);
        r.setNationality(e.getNationality());
        r.setCountryOfBirth(e.getCountryOfBirth());
        r.setPlaceOfBirth(e.getPlaceOfBirth());
        r.setPermanentAddress(e.getPermanentAddress());
        r.setCurrentAddress(e.getCurrentAddress());
        r.setCountry(e.getCountry());
        r.setState(e.getState());
        r.setCity(e.getCity());
        r.setZip(e.getZip());
        r.setWorkEmail(e.getWorkEmail());
        r.setWorkPhone(e.getWorkPhone());
        r.setQualification(e.getQualification());
        r.setExperience(e.getExperience());
        r.setChildren(e.getChildren());
        r.setEmergencyContact(e.getEmergencyContact());
        r.setEmergencyContactName(e.getEmergencyContactName());
        r.setEmergencyContactRelation(e.getEmergencyContactRelation());
        r.setDateJoining(e.getDateJoining());
        r.setEmployeeType(e.getEmployeeType() != null ? e.getEmployeeType().name() : null);
        r.setPhotoPath(e.getPhotoPath());
        r.setActive(e.isActive());
        r.setCreatedAt(e.getCreatedAt());
        if (e.getCompany() != null) {
            r.setCompanyId(e.getCompany().getId());
            r.setCompanyName(e.getCompany().getName());
            if (e.getCompany().getCurrency() != null) r.setCurrencySymbol(e.getCompany().getCurrency());
            if (e.getCompany().getOrganization() != null) {
                r.setOrganizationName(e.getCompany().getOrganization().getName());
            }
        }
        if (e.getDepartment() != null) { r.setDepartmentId(e.getDepartment().getId()); r.setDepartmentName(e.getDepartment().getName()); }
        if (e.getJobPosition() != null) { r.setJobPositionId(e.getJobPosition().getId()); r.setJobPositionName(e.getJobPosition().getName()); }
        if (e.getJobRole() != null) { r.setJobRoleId(e.getJobRole().getId()); r.setJobRoleName(e.getJobRole().getName()); }
        if (e.getWorkType() != null) { r.setWorkTypeId(e.getWorkType().getId()); r.setWorkTypeName(e.getWorkType().getName()); }
        if (e.getShift() != null) { r.setShiftId(e.getShift().getId()); r.setShiftName(e.getShift().getName()); }
        if (e.getReportingManager() != null) {
            r.setReportingManagerId(e.getReportingManager().getId());
            r.setReportingManagerName(e.getReportingManager().getFirstName() + " " + e.getReportingManager().getLastName());
        }
        return r;
    }
}
