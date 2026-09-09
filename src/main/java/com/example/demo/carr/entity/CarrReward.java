package com.example.demo.carr.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name="carr_rewards")
@Getter @Setter
public class CarrReward extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY, optional=false)
    @JoinColumn(name="carr_id", nullable=false)
    private CarrRecord carr;
    @Column(nullable=false, length=220)
    private String name;
    @Column(length=80)
    private String status = "TO_BE_DISCUSSED";
    @Column(name="discussion_with", length=80)
    private String discussionWith = "BOTH";
}
