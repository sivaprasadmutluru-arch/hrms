package com.example.demo.employee.dto;

import com.example.demo.employee.entity.EmployeeWorkInformation;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class WorkInfoResponse {

    private Long id;

    private Long departmentId;
    private String departmentName;

    private Long jobPositionId;
    private String jobPositionName;

    private Long jobRoleId;
    private String jobRoleName;

    private Long shiftId;
    private String shiftName;

    private Long workTypeId;
    private String workTypeName;

    private Long reportingManagerId;
    private String reportingManagerName;

    private String location;
    private String workEmail;
    private String workMobile;

    private LocalDate dateJoining;
    private LocalDate contractEndDate;

    private BigDecimal basicSalary;
    private BigDecimal housingAllowance;
    private BigDecimal transportAllowance;
    private BigDecimal otherAllowance;
    private BigDecimal totalSalary;

    private Double experience;
    private String additionalInfo;

    public static WorkInfoResponse from(EmployeeWorkInformation wi) {
        WorkInfoResponse r = new WorkInfoResponse();
        r.setId(wi.getId());
        r.setLocation(wi.getLocation());
        r.setWorkEmail(wi.getWorkEmail());
        r.setWorkMobile(wi.getWorkMobile());
        r.setDateJoining(wi.getDateJoining());
        r.setContractEndDate(wi.getContractEndDate());
        r.setBasicSalary(wi.getBasicSalary());
        r.setHousingAllowance(wi.getHousingAllowance());
        r.setTransportAllowance(wi.getTransportAllowance());
        r.setOtherAllowance(wi.getOtherAllowance());
        r.setExperience(wi.getExperience());
        r.setAdditionalInfo(wi.getAdditionalInfo());

        if (wi.getDepartment() != null) {
            r.setDepartmentId(wi.getDepartment().getId());
            r.setDepartmentName(wi.getDepartment().getName());
        }
        if (wi.getJobPosition() != null) {
            r.setJobPositionId(wi.getJobPosition().getId());
            r.setJobPositionName(wi.getJobPosition().getName());
        }
        if (wi.getJobRole() != null) {
            r.setJobRoleId(wi.getJobRole().getId());
            r.setJobRoleName(wi.getJobRole().getName());
        }
        if (wi.getShift() != null) {
            r.setShiftId(wi.getShift().getId());
            r.setShiftName(wi.getShift().getName());
        }
        if (wi.getWorkType() != null) {
            r.setWorkTypeId(wi.getWorkType().getId());
            r.setWorkTypeName(wi.getWorkType().getName());
        }
        if (wi.getReportingManager() != null) {
            r.setReportingManagerId(wi.getReportingManager().getId());
            r.setReportingManagerName(
                (wi.getReportingManager().getFirstName() != null ? wi.getReportingManager().getFirstName() : "") +
                (wi.getReportingManager().getLastName() != null ? " " + wi.getReportingManager().getLastName() : "")
            );
        }
        return r;
    }
}
