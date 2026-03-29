package com.example.demo.geofencing.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.geofencing.entity.GeoFencing;
import com.example.demo.geofencing.repository.GeoFencingRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/geofencing")
@RequiredArgsConstructor
@Tag(name = "Geofencing")
public class GeoFencingController {

    private final GeoFencingRepository geoFencingRepository;
    private final CompanyRepository companyRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<GeoFencing>> listAll() {
        return ResponseEntity.ok(geoFencingRepository.findAll());
    }

    @GetMapping("/company/{companyId}")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<GeoFencing> getByCompany(@PathVariable Long companyId) {
        GeoFencing gf = geoFencingRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("GeoFencing config not found for company: " + companyId));
        return ResponseEntity.ok(gf);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<GeoFencing> create(@RequestBody GeoFencingRequest request) {
        GeoFencing gf = new GeoFencing();
        gf.setLatitude(request.getLatitude());
        gf.setLongitude(request.getLongitude());
        gf.setRadiusInMeters(request.getRadiusInMeters());
        gf.setStart(request.isStart());
        if (request.getCompanyId() != null) {
            gf.setCompany(companyRepository.getReferenceById(request.getCompanyId()));
        }
        return ResponseEntity.ok(geoFencingRepository.save(gf));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<GeoFencing> update(@PathVariable Long id, @RequestBody GeoFencingRequest request) {
        GeoFencing gf = geoFencingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GeoFencing", id));
        gf.setLatitude(request.getLatitude());
        gf.setLongitude(request.getLongitude());
        gf.setRadiusInMeters(request.getRadiusInMeters());
        gf.setStart(request.isStart());
        if (request.getCompanyId() != null) {
            gf.setCompany(companyRepository.getReferenceById(request.getCompanyId()));
        }
        return ResponseEntity.ok(geoFencingRepository.save(gf));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        geoFencingRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @PostMapping("/check-location")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> checkLocation(@RequestBody LocationCheckRequest request) {
        GeoFencing gf = geoFencingRepository.findByCompanyId(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "GeoFencing config not found for company: " + request.getCompanyId()));

        double distance = haversineDistance(
                gf.getLatitude(), gf.getLongitude(),
                request.getLatitude(), request.getLongitude()
        );

        boolean withinFence = distance <= gf.getRadiusInMeters();

        return ResponseEntity.ok(Map.of(
                "withinFence", withinFence,
                "distance", distance
        ));
    }

    /**
     * Haversine formula: calculates the great-circle distance between two points on a sphere.
     * R = 6371000 meters (Earth radius)
     */
    private double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000.0;
        double lat1Rad = Math.toRadians(lat1);
        double lat2Rad = Math.toRadians(lat2);
        double deltaLatRad = Math.toRadians(lat2 - lat1);
        double deltaLonRad = Math.toRadians(lon2 - lon1);

        double sinDeltaLat = Math.sin(deltaLatRad / 2);
        double sinDeltaLon = Math.sin(deltaLonRad / 2);

        double a = sinDeltaLat * sinDeltaLat
                + Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinDeltaLon * sinDeltaLon;

        return 2 * R * Math.asin(Math.sqrt(a));
    }

    // ---- Inner request DTOs ----

    public static class GeoFencingRequest {
        private Long companyId;
        private Double latitude;
        private Double longitude;
        private Integer radiusInMeters;
        private boolean start;

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
