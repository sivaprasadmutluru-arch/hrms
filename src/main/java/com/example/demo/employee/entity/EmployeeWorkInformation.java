package com.example.demo.employee.entity;

import com.example.demo.base.entity.*;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.EmployeeType;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "employee_work_information")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EmployeeWorkInformation extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false, unique = true)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_position_id")
    private JobPosition jobPosition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_role_id")
    private JobRole jobRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private ShiftSchedule shift;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_type_id")
    private WorkType workType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporting_manager_id")
    private Employee reportingManager;

    @Column(name = "location")
    private String location;

    @Column(name = "basic_salary", precision = 12, scale = 2)
    private BigDecimal basicSalary;

    @Column(name = "housing_allowance", precision = 12, scale = 2)
    private BigDecimal housingAllowance;

    @Column(name = "transport_allowance", precision = 12, scale = 2)
    private BigDecimal transportAllowance;

    @Column(name = "other_allowance", precision = 12, scale = 2)
    private BigDecimal otherAllowance;

    @Column(name = "date_joining")
    private LocalDate dateJoining;

    @Column(name = "contract_end_date")
    private LocalDate contractEndDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_type_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private EmployeeType employeeType;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "work_info_tags",
        joinColumns = @JoinColumn(name = "work_info_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private List<EmployeeTag> tags = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    @Column(name = "work_email", length = 254)
    private String workEmail;

    @Column(name = "work_mobile", length = 254)
    private String workMobile;

    @Column(name = "salary_hour")
    private Integer salaryHour;

    @Column(name = "additional_info", columnDefinition = "TEXT")
    private String additionalInfo;

    @Column(name = "experience")
    private Double experience;
}
