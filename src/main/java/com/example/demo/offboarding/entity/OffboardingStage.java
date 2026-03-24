package com.example.demo.offboarding.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "offboarding_stages")
@Getter
@Setter
public class OffboardingStage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private OffboardingPlan plan;

    @Column(nullable = false)
    private String title;

    @Column(name = "sequence")
    private Integer sequence = 0;
}
