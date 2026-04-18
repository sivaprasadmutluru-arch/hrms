package com.example.demo.asset.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "assets")
@SQLRestriction("is_active = true")
@Getter
@Setter
public class Asset extends BaseEntity {

    @Column(name = "asset_name", nullable = false)
    private String assetName;

    @Column(name = "asset_id", unique = true)
    private String assetId;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private AssetCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private AssetStatus status = AssetStatus.AVAILABLE;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "purchase_cost", precision = 12, scale = 2)
    private BigDecimal purchaseCost;

    @Column(name = "warranty_expiry")
    private LocalDate warrantyExpiry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id")
    private Employee assignedTo;

    @Column(name = "assigned_date")
    private LocalDate assignedDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    public enum AssetStatus {
        AVAILABLE("Available"),
        IN_USE("In Use"),
        DAMAGED("Damaged"),
        RETIRED("Retired");

        public final String label;

        AssetStatus(String label) {
            this.label = label;
        }
    }
}
