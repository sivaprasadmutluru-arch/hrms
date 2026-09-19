package com.example.demo.biometric.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Additive receipt storage only: does not seed, rewrite or delete attendance. */
@Component @Order(4) @RequiredArgsConstructor
public class BiometricReceiptSchemaRunner implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    public void run(String... args) {
        var schemas = jdbc.queryForList("select distinct schema_name from public.companies where schema_name is not null", String.class);
        for (String schema : schemas) {
            if (!schema.matches("[a-zA-Z0-9_]+")) throw new IllegalStateException("Invalid tenant schema");
            jdbc.execute("CREATE TABLE IF NOT EXISTS \"" + schema + "\".biometric_punch_receipts (LIKE public.biometric_punch_receipts INCLUDING ALL)");
        }
    }
}
