package com.example.demo.offboarding.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "offboarding_general_settings",
        uniqueConstraints = @UniqueConstraint(columnNames = "company_id"))
@Getter
@Setter
public class OffboardingGeneralSetting extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", unique = true)
    private Company company;

    @Column(name = "notice_period_days")
    private Integer noticePeriodDays = 30;

    @Column(name = "enable_exit_interview")
    private Boolean enableExitInterview = true;

    @Column(name = "enable_asset_return_check")
    private Boolean enableAssetReturnCheck = true;

    @Column(name = "enable_knowledge_transfer")
    private Boolean enableKnowledgeTransfer = false;
}
