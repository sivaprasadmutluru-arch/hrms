package com.example.demo.attendance.service;

import com.example.demo.attendance.repository.AttendanceActivityRepository;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.geocoding.service.ReverseGeocodingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * Resolves a human-readable address for a clock-in/out punch in the background, off the request
 * thread — reverse geocoding is a slow, rate-limited external call and must never add latency to
 * the punch itself. Runs on its own thread, so the tenant schema (normally request-scoped via
 * TenantContext) must be passed in explicitly and set on this thread before touching the DB.
 *
 * Deliberately not @Transactional at the method level: TenantContext must be set before Hibernate
 * opens its first session on this thread, and a class-level @Transactional proxy would begin that
 * session (resolving the tenant) before the method body — and TenantContext.setTenant(...) — runs.
 * Each repository call below opens its own short-lived transaction via Spring Data JPA instead,
 * by which point TenantContext is already correctly set.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceAddressResolver {

    private final ReverseGeocodingService reverseGeocodingService;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceActivityRepository attendanceActivityRepository;

    @Async
    public void resolveClockInAddress(Long attendanceId, Long activityId, String tenantSchema,
                                       Double latitude, Double longitude, boolean updateAttendanceSummary) {
        if (latitude == null || longitude == null) return;
        try {
            TenantContext.setTenant(tenantSchema);
            reverseGeocodingService.reverseGeocode(latitude, longitude).ifPresent(address -> {
                if (updateAttendanceSummary) {
                    attendanceRepository.findById(attendanceId).ifPresent(att -> {
                        // Do not let a slower, older async lookup overwrite a newer punch location.
                        if (Objects.equals(att.getCheckInLatitude(), latitude)
                                && Objects.equals(att.getCheckInLongitude(), longitude)) {
                            att.setCheckInAddress(address);
                            attendanceRepository.save(att);
                        }
                    });
                }
                if (activityId != null) {
                    attendanceActivityRepository.findById(activityId).ifPresent(act -> {
                        act.setClockInAddress(address);
                        attendanceActivityRepository.save(act);
                    });
                }
            });
        } catch (Exception e) {
            log.warn("Failed to resolve check-in address for attendance {}: {}", attendanceId, e.getMessage());
        } finally {
            TenantContext.clear();
        }
    }

    @Async
    public void resolveClockOutAddress(Long attendanceId, Long activityId, String tenantSchema,
                                        Double latitude, Double longitude, boolean updateAttendanceSummary) {
        if (latitude == null || longitude == null) return;
        try {
            TenantContext.setTenant(tenantSchema);
            reverseGeocodingService.reverseGeocode(latitude, longitude).ifPresent(address -> {
                if (updateAttendanceSummary) {
                    attendanceRepository.findById(attendanceId).ifPresent(att -> {
                        if (Objects.equals(att.getCheckOutLatitude(), latitude)
                                && Objects.equals(att.getCheckOutLongitude(), longitude)) {
                            att.setCheckOutAddress(address);
                            attendanceRepository.save(att);
                        }
                    });
                }
                if (activityId != null) {
                    attendanceActivityRepository.findById(activityId).ifPresent(act -> {
                        act.setClockOutAddress(address);
                        attendanceActivityRepository.save(act);
                    });
                }
            });
        } catch (Exception e) {
            log.warn("Failed to resolve check-out address for attendance {}: {}", attendanceId, e.getMessage());
        } finally {
            TenantContext.clear();
        }
    }
}
