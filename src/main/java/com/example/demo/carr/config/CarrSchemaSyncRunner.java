package com.example.demo.carr.config;

import com.example.demo.common.tenant.SchemaProvisioningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.List;

/** One-time, opt-in production schema update. Creates missing CARR tables only; never deletes or seeds data. */
@Slf4j @Component @Order(3) @RequiredArgsConstructor
@ConditionalOnProperty(name="carr.schema-sync-enabled", havingValue="true")
public class CarrSchemaSyncRunner implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    private final SchemaProvisioningService provisioning;
    @Override public void run(String... args) {
        List<String> schemas = jdbc.query("select schema_name from public.companies where company_type='HEAD_OFFICE' and is_active=true and schema_name is not null", (rs,n)->rs.getString(1));
        log.info("[CARR] Applying additive schema update to {} tenant schemas", schemas.size());
        for(String schema:schemas){
            provisioning.provisionSchema(schema);
            if(!schema.matches("[a-zA-Z0-9_]+")) throw new IllegalStateException("Unsafe tenant schema name: "+schema);
            jdbc.execute("ALTER TABLE "+schema+".carr_records " +
                    "ADD COLUMN IF NOT EXISTS industry varchar(255), " +
                    "ADD COLUMN IF NOT EXISTS role_level varchar(255), " +
                    "ADD COLUMN IF NOT EXISTS reports_to_title varchar(255), " +
                    "ADD COLUMN IF NOT EXISTS responsible_for varchar(255), " +
                    "ADD COLUMN IF NOT EXISTS rewards_enabled boolean NOT NULL DEFAULT false, " +
                    "ADD COLUMN IF NOT EXISTS rewards_visible_to_employee boolean NOT NULL DEFAULT true, " +
                    "ADD COLUMN IF NOT EXISTS employee_acknowledged_at timestamp, " +
                    "ADD COLUMN IF NOT EXISTS review_completed_at timestamp, " +
                    "ADD COLUMN IF NOT EXISTS employee_reflection text, " +
                    "ADD COLUMN IF NOT EXISTS manager_comments text");
            jdbc.execute("CREATE TABLE IF NOT EXISTS "+schema+".carr_rewards (" +
                    "id bigserial PRIMARY KEY, carr_id bigint NOT NULL REFERENCES "+schema+".carr_records(id) ON DELETE CASCADE, " +
                    "name varchar(220) NOT NULL, status varchar(80), discussion_with varchar(80), " +
                    "is_active boolean NOT NULL DEFAULT true, created_at timestamp, updated_at timestamp)");
            jdbc.execute("ALTER TABLE "+schema+".carr_rewards " +
                    "ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true, " +
                    "ADD COLUMN IF NOT EXISTS created_at timestamp, " +
                    "ADD COLUMN IF NOT EXISTS updated_at timestamp");
            log.info("[CARR] Schema ready: {}",schema);
        }
        log.info("[CARR] Schema sync complete. Set CARR_SCHEMA_SYNC_ENABLED=false after this successful startup.");
    }
}
