package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Entity
@Table(name = "rotating_shifts")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class RotatingShift extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "rotating_shift_employees",
        joinColumns = @JoinColumn(name = "rotating_shift_id"),
        inverseJoinColumns = @JoinColumn(name = "employee_id")
    )
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private List<Employee> employees = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift1_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ShiftSchedule shift1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift2_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ShiftSchedule shift2;

    /**
     * Comma-separated IDs of additional ShiftSchedule entries beyond shift1 and shift2.
     * Supports rotation patterns with 3+ shifts.
     */
    @Column(name = "additional_shift_ids", columnDefinition = "TEXT")
    private String additionalShiftIds;

    public List<Long> getAdditionalShiftIdList() {
        if (additionalShiftIds == null || additionalShiftIds.isBlank()) return List.of();
        return Arrays.stream(additionalShiftIds.split(","))
                .map(String::trim).filter(s -> !s.isEmpty())
                .map(Long::parseLong).collect(Collectors.toList());
    }
}
