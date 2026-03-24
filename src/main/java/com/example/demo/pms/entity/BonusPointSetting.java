package com.example.demo.pms.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "bonus_point_settings",
        uniqueConstraints = @UniqueConstraint(columnNames = "company_id"))
@Getter
@Setter
public class BonusPointSetting extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", unique = true)
    private Company company;

    @Column(name = "points_per_completion")
    private Integer pointsPerCompletion = 10;

    @Column(name = "enable_bonus_points")
    private Boolean enableBonusPoints = true;

    @Column(name = "max_redeemable_points")
    private Integer maxRedeemablePoints = 1000;

    @Column(name = "redemption_rate")
    private Double redemptionRate = 1.0;
}
