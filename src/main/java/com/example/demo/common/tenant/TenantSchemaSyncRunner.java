package com.example.demo.common.tenant;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

/**
 * On every application startup, re-provisions all known tenant schemas.
 *
 * This ensures tenant schemas stay in sync with the current entity definitions,
 * even when new entities are added after a schema was first provisioned.
 * SchemaProvisioningService uses ddl-auto=update, so this is safe and idempotent.
 *
 * Runs after DataSeeder (@Order(1)) so newly-seeded head offices are also covered.
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class TenantSchemaSyncRunner implements CommandLineRunner {

    private final DataSource dataSource;
    private final SchemaProvisioningService schemaProvisioningService;

    @Override
    public void run(String... args) {
        log.info("[TenantSync] Syncing all tenant schemas with current entity definitions...");
        for (String schema : loadHeadOfficeSchemas()) {
            try {
                schemaProvisioningService.provisionSchema(schema);
                log.info("[TenantSync] Schema '{}' synced.", schema);
            } catch (Exception e) {
                log.error("[TenantSync] Failed to sync schema '{}': {}", schema, e.getMessage(), e);
            }
        }
        log.info("[TenantSync] Done.");
    }

    private List<String> loadHeadOfficeSchemas() {
        List<String> schemas = new ArrayList<>();
        String sql = "SELECT schema_name FROM public.companies " +
                     "WHERE company_type = 'HEAD_OFFICE' AND is_active = true AND schema_name IS NOT NULL";
        try (Connection conn = dataSource.getConnection();
             ResultSet rs = conn.prepareStatement(sql).executeQuery()) {
            while (rs.next()) {
                String s = rs.getString("schema_name");
                if (s != null && !s.isBlank()) {
                    schemas.add(s);
                }
            }
        } catch (Exception e) {
            log.error("[TenantSync] Failed to load tenant schemas: {}", e.getMessage(), e);
        }
        return schemas;
    }
}
