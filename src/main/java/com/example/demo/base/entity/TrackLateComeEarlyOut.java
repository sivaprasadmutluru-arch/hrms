package com.example.demo.base.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "track_late_come_early_out")
@Getter
@Setter
public class TrackLateComeEarlyOut extends BaseEntity {

    @Column(name = "minimum_late_come_minutes")
    private Integer minimumLateComeMinutes = 15;

    @Column(name = "minimum_early_out_minutes")
    private Integer minimumEarlyOutMinutes = 15;

    @Column(name = "enable_late_come_tracking")
    private Boolean enableLateComeTracking = true;

    @Column(name = "enable_early_out_tracking")
    private Boolean enableEarlyOutTracking = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;
}
