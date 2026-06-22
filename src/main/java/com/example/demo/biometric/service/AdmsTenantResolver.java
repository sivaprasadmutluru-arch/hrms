package com.example.demo.biometric.service;

import com.example.demo.common.tenant.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Resolves the correct multi-tenant PostgreSQL schema for a ZKTeco device
 * based on its serial number (SN).
 *
 * <p>A physical biometric device sends its serial number as a URL query parameter
 * (SN=...) but has no concept of tenants, JWT tokens, or X-Company-Id headers.
 * This resolver bridges that gap by scanning all active tenant schemas to find
 * which one owns the device with the given SN.</p>
 *
 * <h3>How it works:</h3>
 * <ol>
 *   <li>Queries {@code public.companies} to get all active HEAD_OFFICE schema names
 *       that have a {@code biometric_devices} table.</li>
 *   <li>For each candidate schema, uses raw JDBC to check if
 *       {@code <schema>.biometric_devices} contains a row where
 *       {@code serial_number = ? AND is_active = true}.</li>
 *   <li>Returns the matching schema name (e.g. {@code "prabha_technologies"}).</li>
 * </ol>
 *
 * <h3>Performance:</h3>
 * <p>Results are cached in-memory for 60 seconds per serial number. Even if a device
 * pushes every second, the cross-schema scan only runs once per minute.</p>
 *
 * <h3>Usage (in AdmsController):</h3>
 * <pre>
 *   String schema = resolver.resolveSchema(serialNumber);
 *   if (schema != null) {
 *       TenantContext.setTenant(schema);
 *       admsService.processAttlogPush(serialNumber, content);
 *       TenantContext.clear();
 *   }
 * </pre>
 */
@Component
@Slf4j
public class AdmsTenantResolver {

    /** Cache: serial_number → { schemaName, expiresAt } */
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    /** How long a resolved schema is cached (milliseconds). */
    private static final long CACHE_TTL_MS = 60_000;

    /** SQL to find all active head-office schemas that have a biometric_devices table. */
    private static final String LOAD_SCHEMAS_SQL = """
            SELECT c.schema_name
            FROM public.companies c
            WHERE c.company_type = 'HEAD_OFFICE'
              AND c.is_active = true
              AND c.schema_name IS NOT NULL
              AND EXISTS (
                  SELECT 1 FROM information_schema.tables t
                  WHERE t.table_schema = c.schema_name
                    AND t.table_name = 'biometric_devices'
              )
            """;

    /**
     * Parameterized check for device existence in a specific schema.
     * Uses {@code SET search_path} to temporarily point to the target schema,
     * then queries without a schema prefix. The search_path is reset afterward.
     *
     * This approach avoids unsafe string interpolation of schema names into SQL
     * while still supporting parameterized serial number binding.
     */
    private static final String CHECK_DEVICE_SQL =
            "SELECT 1 FROM biometric_devices WHERE serial_number = ? AND is_active = true";

    private final DataSource dataSource;

    public AdmsTenantResolver(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Resolve the tenant schema that owns the device with the given serial number.
     *
     * @param serialNumber the device serial number (SN parameter from ADMS push)
     * @return the PostgreSQL schema name (e.g. "prabha_technologies"), or null if not found
     */
    public String resolveSchema(String serialNumber) {
        if (serialNumber == null || serialNumber.isBlank()) {
            return null;
        }

        // Check cache first
        CacheEntry cached = cache.get(serialNumber);
        if (cached != null) {
            if (System.currentTimeMillis() < cached.expiresAt) {
                log.debug("ADMS TenantResolver: cache hit for SN='{}' → schema='{}'", serialNumber, cached.schemaName);
                return cached.schemaName;
            }
            cache.remove(serialNumber); // evict stale
        }

        // Cross-tenant scan via raw JDBC (bypasses Hibernate tenant resolver entirely)
        String schema = doResolve(serialNumber);
        if (schema != null) {
            cache.put(serialNumber, new CacheEntry(schema, System.currentTimeMillis() + CACHE_TTL_MS));
            log.info("ADMS TenantResolver: resolved SN='{}' → schema='{}'", serialNumber, schema);
        } else {
            log.warn("ADMS TenantResolver: no schema found for SN='{}'", serialNumber);
        }
        return schema;
    }

    /**
     * The actual cross-schema scan logic.
     *
     * For each candidate schema returned by loadCandidateSchemas(), we:
     * 1. SET search_path TO <schema>, public  (safe — schema comes from our own public.companies table)
     * 2. Execute the parameterized CHECK_DEVICE_SQL (serial_number is bound as a prepared statement param)
     * 3. SET search_path back to public
     */
    private String doResolve(String serialNumber) {
        List<String> schemas = loadCandidateSchemas();
        if (schemas.isEmpty()) {
            log.debug("ADMS TenantResolver: no candidate tenant schemas with biometric_devices table");
            return null;
        }

        log.debug("ADMS TenantResolver: scanning {} schemas for SN='{}'", schemas.size(), serialNumber);

        try (Connection conn = dataSource.getConnection()) {
            // Ensure we start from a clean state
            resetSearchPath(conn);

            for (String schema : schemas) {
                try {
                    // Temporarily point to the candidate tenant schema
                    setSearchPath(conn, schema);

                    try (PreparedStatement ps = conn.prepareStatement(CHECK_DEVICE_SQL)) {
                        ps.setString(1, serialNumber);
                        try (ResultSet rs = ps.executeQuery()) {
                            if (rs.next()) {
                                log.debug("ADMS TenantResolver: found SN='{}' in schema='{}'", serialNumber, schema);
                                return schema;
                            }
                        }
                    }
                } catch (SQLException e) {
                    log.trace("ADMS TenantResolver: schema '{}' check failed (table may not exist yet): {}",
                            schema, e.getMessage());
                } finally {
                    // Always reset search_path back to public before trying the next schema
                    try { resetSearchPath(conn); } catch (SQLException ignored) {}
                }
            }
        } catch (SQLException e) {
            log.error("ADMS TenantResolver: database error during schema scan: {}", e.getMessage());
        }

        return null;
    }

    /**
     * Load all active head-office schemas that contain a biometric_devices table.
     */
    private List<String> loadCandidateSchemas() {
        List<String> schemas = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(LOAD_SCHEMAS_SQL)) {
            while (rs.next()) {
                schemas.add(rs.getString("schema_name"));
            }
        } catch (SQLException e) {
            log.error("ADMS TenantResolver: failed to load candidate schemas: {}", e.getMessage());
        }
        return schemas;
    }

    private void setSearchPath(Connection conn, String schema) throws SQLException {
        try (Statement stmt = conn.createStatement()) {
            stmt.execute("SET search_path TO " + schema + ", public");
        }
    }

    private void resetSearchPath(Connection conn) throws SQLException {
        try (Statement stmt = conn.createStatement()) {
            stmt.execute("SET search_path TO public");
        }
    }

    /**
     * Evict a specific serial number from the cache (e.g. after device update/delete).
     */
    public void evictCache(String serialNumber) {
        cache.remove(serialNumber);
    }

    /**
     * Clear the entire cache (e.g. after schema provisioning).
     */
    public void clearCache() {
        cache.clear();
    }

    /** Simple cache entry holder. */
    private static class CacheEntry {
        final String schemaName;
        final long expiresAt;
        CacheEntry(String schemaName, long expiresAt) {
            this.schemaName = schemaName;
            this.expiresAt = expiresAt;
        }
    }
}
