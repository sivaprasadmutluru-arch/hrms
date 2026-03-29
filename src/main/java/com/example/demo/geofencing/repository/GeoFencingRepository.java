package com.example.demo.geofencing.repository;

import com.example.demo.geofencing.entity.GeoFencing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GeoFencingRepository extends JpaRepository<GeoFencing, Long> {
    Optional<GeoFencing> findByCompanyId(Long companyId);
    Optional<GeoFencing> findFirstByCompanyIsNull();
}
