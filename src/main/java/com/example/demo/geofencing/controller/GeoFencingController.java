package com.example.demo.geofencing.controller;

import com.example.demo.geofencing.entity.GeoFencing;
import com.example.demo.geofencing.service.GeoFencingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/geofencing")
@RequiredArgsConstructor
@Tag(name = "Geofencing")
public class GeoFencingController {

    private final GeoFencingService geoFencingService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<GeoFencing>> listAll() {
        return ResponseEntity.ok(geoFencingService.listAll());
    }

    @GetMapping("/company/{companyId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<GeoFencing> getByCompany(@PathVariable Long companyId) {
        return ResponseEntity.ok(geoFencingService.getByCompany(companyId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<GeoFencing> create(@RequestBody GeoFencingRequest request) {
        return ResponseEntity.ok(geoFencingService.create(
                request.getLatitude(), request.getLongitude(),
                request.getRadiusInMeters(), request.isStart(), request.isEnforceGeofence(), request.getCompanyId()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<GeoFencing> update(@PathVariable Long id, @RequestBody GeoFencingRequest request) {
        return ResponseEntity.ok(geoFencingService.update(id,
                request.getLatitude(), request.getLongitude(),
                request.getRadiusInMeters(), request.isStart(), request.isEnforceGeofence(), request.getCompanyId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        geoFencingService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @PostMapping("/check-location")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> checkLocation(@RequestBody LocationCheckRequest request) {
        return ResponseEntity.ok(geoFencingService.checkLocation(
                request.getCompanyId(), request.getLatitude(), request.getLongitude()));
    }

    // ---- Inner request DTOs ----

    public static class GeoFencingRequest {
        private Long companyId;
        private Double latitude;
        private Double longitude;
        private Integer radiusInMeters;
        private boolean start;
        private boolean enforceGeofence;

        public Long getCompanyId() { return companyId; }
        public void setCompanyId(Long companyId) { this.companyId = companyId; }
        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }
        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }
        public Integer getRadiusInMeters() { return radiusInMeters; }
        public void setRadiusInMeters(Integer radiusInMeters) { this.radiusInMeters = radiusInMeters; }
        public boolean isStart() { return start; }
        public void setStart(boolean start) { this.start = start; }
        public boolean isEnforceGeofence() { return enforceGeofence; }
        public void setEnforceGeofence(boolean enforceGeofence) { this.enforceGeofence = enforceGeofence; }
    }

    public static class LocationCheckRequest {
        private Long companyId;
        private Double latitude;
        private Double longitude;

        public Long getCompanyId() { return companyId; }
        public void setCompanyId(Long companyId) { this.companyId = companyId; }
        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }
        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }
    }
}
