package com.example.demo.common.tenant;

import jakarta.persistence.EntityManagerFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.boot.Metadata;
import org.springframework.scheduling.annotation.Async;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.cfg.AvailableSettings;
import org.hibernate.tool.schema.spi.SchemaManagementToolCoordinator;
import org.hibernate.tool.schema.spi.DelayedDropRegistryNotAvailableImpl;
import org.springframework.jdbc.datasource.DelegatingDataSource;
import org.springframework.stereotype.Service;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

/**
 * Provisions a new PostgreSQL schema for a head-office tenant.
 *
 * Instead of maintaining a static SQL file, this service:
 * 1. Creates the schema via JDBC
 * 2. Uses Hibernate's own schema-update engine (pointed at the new schema via search_path)
 *    to create all tenant tables — automatically staying in sync with entity changes.
 *
 * Called when a new Head Office company is created.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SchemaProvisioningService {

    private final DataSource dataSource;
    private final EntityManagerFactory entityManagerFactory;

    /**
     * Creates a PostgreSQL schema and provisions all tenant tables inside it.
     * Idempotent — safe to call even if the schema already partially exists.
     */
    public void provisionSchema(String schemaName) {
        validateSchemaName(schemaName);
        try {
            // Step 1: Create the schema
            try (Connection conn = dataSource.getConnection()) {
                conn.setAutoCommit(true);
                conn.createStatement().execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);
                log.info("[Tenant] Created schema: {}", schemaName);
            }

            // Step 2: Build a DataSource that routes every connection to the new schema
            DataSource schemaDs = new SearchPathDataSource(dataSource, schemaName);

            // Step 3: Build a Hibernate ServiceRegistry using our schema-aware DataSource
            StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                    .applySetting(AvailableSettings.DIALECT, "org.hibernate.dialect.PostgreSQLDialect")
                    .applySetting(AvailableSettings.DATASOURCE, schemaDs)
                    .build();
            try {
                // Step 4: Build Hibernate Metadata from all entity classes in this persistence unit
                MetadataSources sources = new MetadataSources(registry);
                entityManagerFactory.getMetamodel().getEntities()
                        .forEach(et -> sources.addAnnotatedClass(et.getJavaType()));
                Metadata metadata = sources.buildMetadata();

                // Step 5: Run schema update — creates missing tables, skips existing ones
                // Entities with @Table(schema="public") stay in the public schema;
                // all other entities are created in schemaName via search_path.
                Map<String, Object> settings = new HashMap<>();
                settings.put(AvailableSettings.HBM2DDL_AUTO, "update");
                settings.put(AvailableSettings.DATASOURCE, schemaDs);
                SchemaManagementToolCoordinator.process(
                        metadata, registry, settings, DelayedDropRegistryNotAvailableImpl.INSTANCE);

                log.info("[Tenant] Schema provisioned successfully: {}", schemaName);
            } finally {
                StandardServiceRegistryBuilder.destroy(registry);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to provision schema: " + schemaName, e);
        }
    }

    /**
     * Fire-and-forget version — returns immediately, provisions in a background thread.
     * Use this from HTTP request handlers so the response is not delayed.
     */
    @Async
    public void provisionSchemaAsync(String schemaName) {
        try {
            provisionSchema(schemaName);
        } catch (Exception e) {
            log.error("[Tenant] Background schema provisioning failed for '{}': {}", schemaName, e.getMessage(), e);
        }
    }

    /**
     * Converts a company name to a safe PostgreSQL schema identifier.
     * "Yuwa Tech Solutions" → "yuwa_tech_solutions"
     */
    public static String toSchemaName(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
    }

    private void validateSchemaName(String schemaName) {
        if (!schemaName.matches("[a-z][a-z0-9_]*")) {
            throw new IllegalArgumentException("Invalid schema name: " + schemaName);
        }
    }

    /**
     * A DataSource proxy that sets search_path to the target schema on every connection.
     * This routes Hibernate's DDL operations to the correct tenant schema.
     */
    private static class SearchPathDataSource extends DelegatingDataSource {
        private final String schemaName;

        SearchPathDataSource(DataSource delegate, String schemaName) {
            super(delegate);
            this.schemaName = schemaName;
        }

        @Override
        public Connection getConnection() throws SQLException {
            Connection conn = super.getConnection();
            conn.createStatement().execute("SET search_path TO " + schemaName + ", public");
            return conn;
        }

        @Override
        public Connection getConnection(String username, String password) throws SQLException {
            Connection conn = super.getConnection(username, password);
            conn.createStatement().execute("SET search_path TO " + schemaName + ", public");
            return conn;
        }
    }
}
