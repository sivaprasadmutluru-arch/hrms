package com.example.demo.helpdesk.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "helpdesk_tags")
@Getter
@Setter
public class HelpdeskTag extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "color", length = 20)
    private String color;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
