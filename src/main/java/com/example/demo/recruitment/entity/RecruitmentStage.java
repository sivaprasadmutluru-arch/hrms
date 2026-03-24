package com.example.demo.recruitment.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "recruitment_stages")
@Getter
@Setter
public class RecruitmentStage extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "sequence")
    private Integer sequence;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage_type")
    private StageType stageType = StageType.INITIAL;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recruitment_id", nullable = false)
    private RecruitmentPost recruitment;

    public enum StageType {
        INITIAL, APPLIED, INTERVIEW, OFFER, CONTRACT_SIGNED, CANCELLED
    }
}
