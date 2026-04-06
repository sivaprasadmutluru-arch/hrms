package com.example.demo.audit.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "audit_tags")
@Getter
@Setter
public class AuditTag extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "color", length = 20)
    private String color;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
