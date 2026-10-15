package com.example.demo.common.tenant;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

/** Adds new, nullable accrual-policy columns to every existing tenant safely at startup. */
@Slf4j
@Component
@Order(3)
public class LeaveAccrualSchemaMigration implements CommandLineRunner {
    private final DataSource dataSource;

    public LeaveAccrualSchemaMigration(DataSource dataSource) { this.dataSource = dataSource; }

    @Override public void run(String... args) {
        for (String schema : schemas()) {
            if (!schema.matches("[a-z0-9_]+")) continue;
            String table = schema + ".leave_types";
            try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
                statement.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS accrual_posting_timing varchar(32)");
                statement.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS accrual_calculation_method varchar(32)");
                statement.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS accrual_precision integer");
                statement.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS accrual_proration_basis varchar(32)");
            } catch (Exception error) {
                log.error("Could not add leave accrual policy columns to tenant {}", schema, error);
            }
        }
    }

    private List<String> schemas() {
        List<String> result = new ArrayList<>();
        String sql = "SELECT schema_name FROM public.companies WHERE company_type = 'HEAD_OFFICE' AND is_active = true AND schema_name IS NOT NULL";
        try (var connection = dataSource.getConnection(); var statement = connection.prepareStatement(sql); ResultSet rows = statement.executeQuery()) {
            while (rows.next()) result.add(rows.getString(1));
        } catch (Exception error) { log.error("Could not list tenant schemas for leave accrual migration", error); }
        return result;
    }
}
