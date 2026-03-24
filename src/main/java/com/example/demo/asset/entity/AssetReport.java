package com.example.demo.asset.entity;

import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "asset_reports")
@Getter
@Setter
public class AssetReport extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by_id")
    private Employee reportedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type")
    private ReportType reportType = ReportType.DAMAGE;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    public enum ReportType {
        DAMAGE, LOSS, MAINTENANCE, RETURN
    }
}
