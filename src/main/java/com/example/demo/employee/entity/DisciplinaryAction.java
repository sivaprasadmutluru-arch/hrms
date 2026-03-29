package com.example.demo.employee.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "disciplinary_actions")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class DisciplinaryAction extends BaseEntity {

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "disciplinary_action_employees",
        joinColumns = @JoinColumn(name = "disciplinary_action_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id")
    )
    private List<Employee> employees;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    private ActionType actionType;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "days")
    private Integer days;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "attachment_path")
    private String attachmentPath;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "unit_in", length = 10)
    private String unitIn = "days";

    @Column(name = "hours", length = 6)
    private String hours = "00:00";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "action_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private com.example.demo.employee.entity.ActionType action;

    public enum ActionType {
        WARNING, SUSPENSION, DEMOTION, TERMINATION, WRITTEN_WARNING, VERBAL_WARNING
    }
}
