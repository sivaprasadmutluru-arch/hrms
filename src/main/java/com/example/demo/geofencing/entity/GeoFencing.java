package com.example.demo.geofencing.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "geo_fencing")
@Getter
@Setter
public class GeoFencing extends BaseEntity {

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "radius_in_meters")
    private Integer radiusInMeters;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = true)
    private Company company;

    @Column(name = "start")
    private boolean start = false;

    /** When true, self-service clock-in/out outside this fence (or with no location at all) is blocked. */
    @Column(name = "enforce_geofence")
    private boolean enforceGeofence = false;
}
