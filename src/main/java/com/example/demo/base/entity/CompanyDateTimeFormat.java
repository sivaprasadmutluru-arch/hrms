package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "company_datetime_formats")
@Getter
@Setter
public class CompanyDateTimeFormat extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, unique = true)
    private Company company;

    @Column(name = "date_format", length = 30)
    private String dateFormat = "yyyy-MM-dd";

    @Column(name = "time_format", length = 20)
    private String timeFormat = "HH:mm";
}
