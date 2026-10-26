package com.example.demo.biometric.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.Map;

/** Normalizes legacy receipt column names without rewriting or deleting punches. */
@Component @Order(4) @RequiredArgsConstructor
public class BiometricReceiptSchemaRunner implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    @Transactional
    public void run(String... args) {
        normalizeColumns("public");
        var schemas = jdbc.queryForList("select distinct schema_name from public.companies where schema_name is not null", String.class);
        for (String schema : schemas) {
            if (!schema.matches("[a-zA-Z0-9_]+")) throw new IllegalStateException("Invalid tenant schema");
            jdbc.execute("CREATE TABLE IF NOT EXISTS \"" + schema + "\".biometric_punch_receipts (LIKE public.biometric_punch_receipts INCLUDING ALL)");
            normalizeColumns(schema);
        }
    }

    private void normalizeColumns(String schema) {
        var columns = new HashSet<>(jdbc.queryForList(
                "select column_name from information_schema.columns where table_schema = ? and table_name = 'biometric_punch_receipts'",
                String.class, schema));
        Map<String, String> names = new LinkedHashMap<>();
        names.put("serialnumber", "serial_number");
        names.put("deviceuserid", "device_user_id");
        names.put("devicetime", "device_time");
        names.put("devicestatus", "device_status");
        names.put("processingstate", "processing_state");
        names.put("employeeid", "employee_id");
        names.forEach((legacy, canonical) -> {
            if (columns.contains(legacy) && columns.contains(canonical)) {
                throw new IllegalStateException("Ambiguous biometric receipt columns in " + schema + ": " + legacy + ", " + canonical);
            }
        });
        names.forEach((legacy, canonical) -> {
            if (columns.contains(legacy)) {
                jdbc.execute("ALTER TABLE \"" + schema + "\".biometric_punch_receipts RENAME COLUMN \"" + legacy + "\" TO \"" + canonical + "\"");
            }
        });
    }
}
