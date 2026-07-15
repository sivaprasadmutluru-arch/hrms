package com.example.demo.geocoding.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Optional;

/**
 * Converts GPS coordinates to a human-readable address via OpenStreetMap Nominatim (free, no API key).
 *
 * Nominatim's usage policy caps public API traffic at 1 request/second and requires an identifying
 * User-Agent — both are enforced here. This is best-effort: any failure, timeout, or rate-limit
 * response results in an empty address rather than blocking or failing the calling flow.
 * Swap to Google Geocoding (or a self-hosted Nominatim instance) here if usage outgrows the free tier.
 */
@Service
@Slf4j
public class ReverseGeocodingService {

    private static final String USER_AGENT = "CloudHRMS-Attendance/1.0";
    private static final long MIN_INTERVAL_MS = 1100; // stay under Nominatim's 1 req/sec cap

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static volatile long lastCallAtMs = 0;

    public Optional<String> reverseGeocode(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) return Optional.empty();

        throttle();

        try {
            String url = String.format(Locale.US,
                    "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=%f&lon=%f&zoom=18&addressdetails=0",
                    latitude, longitude);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", USER_AGENT)
                    .timeout(Duration.ofSeconds(4))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.debug("Reverse geocode non-200 status {} for ({}, {})", response.statusCode(), latitude, longitude);
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode displayName = root.get("display_name");
            return displayName != null && !displayName.isNull()
                    ? Optional.of(displayName.asText())
                    : Optional.empty();
        } catch (Exception e) {
            log.debug("Reverse geocode failed for ({}, {}): {}", latitude, longitude, e.getMessage());
            return Optional.empty();
        }
    }

    private synchronized void throttle() {
        long elapsed = System.currentTimeMillis() - lastCallAtMs;
        if (elapsed < MIN_INTERVAL_MS) {
            try {
                Thread.sleep(MIN_INTERVAL_MS - elapsed);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        lastCallAtMs = System.currentTimeMillis();
    }
}
