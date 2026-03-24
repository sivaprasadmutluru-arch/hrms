package com.example.demo.leave.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "company_leaves")
@Getter
@Setter
public class CompanyLeave extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "based_on_week_day")
    private Boolean basedOnWeekDay = false;

    @Column(name = "week_day")
    private Integer weekDay;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;
}
