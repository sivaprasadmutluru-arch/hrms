package com.example.demo.audit.entity;

import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "history_tracking_fields")
@Getter
@Setter
public class HistoryTrackingFields extends BaseEntity {

    @Column(name = "tracking_fields", columnDefinition = "TEXT")
    private String trackingFields;  // JSON stored as text

    @Column(name = "work_info_track")
    private boolean workInfoTrack = true;
}
