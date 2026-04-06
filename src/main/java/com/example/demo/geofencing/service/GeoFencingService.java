package com.example.demo.geofencing.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.geofencing.entity.GeoFencing;
import com.example.demo.geofencing.repository.GeoFencingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class GeoFencingService {

    private final GeoFencingRepository geoFencingRepository;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public List<GeoFencing> listAll() {
        return geoFencingRepository.findAll();
    }

    @Transactional(readOnly = true)
    public GeoFencing getByCompany(Long companyId) {
        return geoFencingRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "GeoFencing config not found for company: " + companyId));
    }

    public GeoFencing create(Double latitude, Double longitude, Integer radiusInMeters,
                             boolean start, Long companyId) {
        GeoFencing gf = new GeoFencing();
        gf.setLatitude(latitude);
        gf.setLongitude(longitude);
        gf.setRadiusInMeters(radiusInMeters);
        gf.setStart(start);
        if (companyId != null) {
            gf.setCompany(companyRepository.getReferenceById(companyId));
        }
        return geoFencingRepository.save(gf);
    }

    public GeoFencing update(Long id, Double latitude, Double longitude, Integer radiusInMeters,
                             boolean start, Long companyId) {
        GeoFencing gf = geoFencingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GeoFencing", id));
        gf.setLatitude(latitude);
        gf.setLongitude(longitude);
        gf.setRadiusInMeters(radiusInMeters);
        gf.setStart(start);
        if (companyId != null) {
            gf.setCompany(companyRepository.getReferenceById(companyId));
        }
        return geoFencingRepository.save(gf);
    }

    public void delete(Long id) {
        geoFencingRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> checkLocation(Long companyId, Double latitude, Double longitude) {
        GeoFencing gf = geoFencingRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "GeoFencing config not found for company: " + companyId));
        double distance = haversineDistance(gf.getLatitude(), gf.getLongitude(), latitude, longitude);
        boolean withinFence = distance <= gf.getRadiusInMeters();
        return Map.of("withinFence", withinFence, "distance", distance);
    }

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
}
