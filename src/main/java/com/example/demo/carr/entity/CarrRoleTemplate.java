package com.example.demo.carr.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.JobRole;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity @Table(name = "carr_role_templates") @Getter @Setter
public class CarrRoleTemplate extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name="company_id", nullable=false)
    private Company company;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="job_role_id")
    private JobRole jobRole;
    @Column(nullable=false, length=180) private String title;
    @Column(columnDefinition="text") private String purpose;
    @Column(columnDefinition="text") private String scope;
    @Column(columnDefinition="text") private String competencies;
    @Column(nullable=false) private int version = 1;
}
