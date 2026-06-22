package com.example.demo.biometric.controller;

import com.example.demo.biometric.service.AdmsService;
import com.example.demo.biometric.service.AdmsTenantResolver;
import com.example.demo.common.tenant.TenantContext;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.IOException;
import java.util.stream.Collectors;

/**
 * ZKTeco ADMS Push Protocol Controller.
 *
 * These endpoints are called directly by the biometric device firmware (SA20, SpeedFace-H5L, etc.)
 * over plain HTTP. They must be:
 *   - Unauthenticated (device cannot send JWT tokens)
 *   - CSRF-exempt (device does not send CSRF tokens)
 *   - Return text/plain responses
 *
 * The device sends its serial number (SN) as a URL query parameter in every request.
 *
 * <h3>Multi-tenant routing</h3>
 * Because the device has no concept of tenants or auth tokens, every request resolves
 * the tenant schema from the SN via {@link AdmsTenantResolver} and sets the
 * {@link TenantContext} before delegating to {@link AdmsService}. This ensures
 * Hibernate queries hit the correct tenant schema (e.g. prabha_technologies),
 * not the default "public" schema.
 */
@RestController
@RequestMapping("/iclock")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "ADMS Push (ZKTeco Device)")
public class AdmsController {

    private final AdmsService admsService;
    private final AdmsTenantResolver tenantResolver;

    /**
     * Device heartbeat / handshake.
     * The device polls this endpoint every ~10 seconds.
     * MUST return the exact ATTLOGStamp format or the device stops pushing data.
     */
    @GetMapping(value = "/getrequest", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getRequest(
            @RequestParam(value = "SN", defaultValue = "") String serialNumber,
            @RequestParam(value = "INFO", required = false) String info) {

        // Resolve & set tenant context for this device's handshake
        runInTenant(serialNumber, () -> {
            if (info != null && !info.isEmpty()) {
                admsService.logDeviceInfo(serialNumber, info);
            }
        });

        // ATTLOGStamp=0 tells the device to send ALL records from the beginning.
        // Realtime=1 enables real-time push mode.
        String response = "GET OPTION FROM: " + serialNumber + "\n"
                + "ATTLOGStamp=0\n"
                + "OPERLOGStamp=0\n"
                + "ATTPHOTOStamp=0\n"
                + "Realtime=1\n"
                + "Encrypt=0\n"
                + "ServerVer=3.0.1\n"
                + "TableNameStamp=\n"
                + "TransFlag=1111111111\n";

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body(response);
    }

    /**
     * Device health check / ping.
     */
    @GetMapping(value = "/ping", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> ping(
            @RequestParam(value = "SN", defaultValue = "") String serialNumber) {
        log.debug("ADMS ping from SN={}", serialNumber);
        return ResponseEntity.ok("OK");
    }

    /**
     * Attendance data push endpoint.
     * The device POSTs punch records here with ATTLOG table data.
     *
     * SN is always in the URL query params.
     * The ATTLOG content comes in the raw request body.
     * Each line of content: USER_ID\tDATETIME\tSTATUS\tVERIFY_TYPE\tWORK_CODE\tRESERVED
     */
    @PostMapping(value = "/cdata", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> pushAttendance(
            @RequestParam(value = "SN", defaultValue = "") String serialNumber,
            @RequestParam(value = "table", defaultValue = "") String table,
            @RequestParam(value = "Stamp", defaultValue = "0") String stamp,
            HttpServletRequest request) {

        if (serialNumber.isEmpty()) {
            log.warn("ADMS cdata received without SN parameter");
            return ResponseEntity.ok("OK");
        }

        // Only process ATTLOG (attendance log) table pushes
        if (!"ATTLOG".equalsIgnoreCase(table)) {
            log.debug("ADMS cdata from SN={} table={} - skipping (not ATTLOG)", serialNumber, table);
            return ResponseEntity.ok("OK");
        }

        // Read content from request body
        String requestContent = "";
        try {
            try (BufferedReader reader = request.getReader()) {
                requestContent = reader.lines().collect(Collectors.joining("\n"));
            }
        } catch (IOException e) {
            log.error("ADMS cdata: failed to read request body from SN={}: {}", serialNumber, e.getMessage());
            return ResponseEntity.ok("OK");
        }

        if (requestContent.isEmpty()) {
            log.debug("ADMS cdata from SN={} - empty content, skipping", serialNumber);
            return ResponseEntity.ok("OK");
        }

        // Process the punch records inside the resolved tenant context
        final String finalContent = requestContent;
        runInTenant(serialNumber, () -> admsService.processAttlogPush(serialNumber, finalContent));

        return ResponseEntity.ok("OK");
    }

    /**
     * Device command polling endpoint.
     * The device checks here for pending commands (e.g., reboot, sync time).
     * We don't send any commands for now, just return OK.
     */
    @GetMapping(value = "/devicecmd", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> deviceCmd(
            @RequestParam(value = "SN", defaultValue = "") String serialNumber) {
        return ResponseEntity.ok("OK");
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Tenant context helper
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Runs a task inside the tenant context resolved from the device serial number.
     *
     * <p>This is the critical multi-tenant fix: the ADMS endpoints sit outside the
     * {@code /api/**} interceptor chain, so {@link TenantContext} is never set by
     * the normal request flow. We resolve the schema from the SN here, set it,
     * run the task, and always clear it afterward (even on exception).</p>
     *
     * <p>If the schema can't be resolved (unknown SN), the task is NOT run — this
     * prevents punches from being silently written to the public schema.</p>
     */
    private void runInTenant(String serialNumber, Runnable task) {
        if (serialNumber == null || serialNumber.isBlank()) {
            log.debug("ADMS: no SN provided - skipping tenant resolution");
            return;
        }

        String schema = tenantResolver.resolveSchema(serialNumber);
        if (schema == null) {
            log.warn("ADMS: could not resolve tenant for SN='{}' - punch will be ignored", serialNumber);
            return;
        }

        try {
            TenantContext.setTenant(schema);
            task.run();
        } finally {
            TenantContext.clear();
        }
    }
}
