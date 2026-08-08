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
import java.sql.Savepoint;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.stream.Collectors;

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

            // Step 1b: Drop FK constraints in this tenant schema that wrongly reference
            // public-schema tables when those tables also exist in the tenant schema.
            // This happens when a tenant table was provisioned before its referenced
            // table existed in the tenant schema (causing PostgreSQL to resolve the FK
            // against public instead). ddl-auto=update never fixes existing FKs, so we
            // must drop them here so Hibernate recreates them pointing to the right schema.
            dropMisroutedForeignKeys(schemaName);

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
     * Converts a company name to a safe PostgreSQL schema identifier.
     * "Yuwa Tech Solutions" → "yuwa_tech_solutions"
     */
    public static String toSchemaName(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
    }

    /**
     * Drops FK constraints in the tenant schema that incorrectly reference the public schema
     * for tables that also exist (or will be created) in the tenant schema.
     *
     * Root cause: when Hibernate first creates a tenant table with a FK like
     * "REFERENCES holidays(id)", PostgreSQL resolves the target via the current search_path.
     * If the tenant-schema copy of "holidays" did not yet exist at that moment, PostgreSQL
     * falls back to public.holidays. ddl-auto=update never drops/recreates existing
     * constraints, so the wrong FK persists across restarts.
     *
     * Fix: drop the offending FKs before the Hibernate DDL update runs; Hibernate will
     * recreate them with search_path set to "{tenant}, public", at which point
     * the tenant-schema table takes precedence and the FK is created correctly.
     */
    private void dropMisroutedForeignKeys(String schemaName) {
        // Find FK constraints in this tenant schema whose referenced table lives in
        // public AND also exists in the tenant schema (those are the wrong ones).
        String findSql = """
                SELECT c.conname  AS constraint_name,
                       src.relname AS table_name
                FROM   pg_constraint c
                JOIN   pg_class src  ON src.oid = c.conrelid
                JOIN   pg_namespace src_ns ON src_ns.oid = src.relnamespace
                JOIN   pg_class ref  ON ref.oid = c.confrelid
                JOIN   pg_namespace ref_ns ON ref_ns.oid = ref.relnamespace
                WHERE  c.contype = 'f'
                  AND  src_ns.nspname = ?
                  AND  ref_ns.nspname = 'public'
                  AND  EXISTS (
                           SELECT 1 FROM information_schema.tables t
                           WHERE  t.table_schema = ? AND t.table_name = ref.relname
                       )
                """;
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(true);
            try (var ps = conn.prepareStatement(findSql)) {
                ps.setString(1, schemaName);
                ps.setString(2, schemaName);
                try (var rs = ps.executeQuery()) {
                    while (rs.next()) {
                        String constraintName = rs.getString("constraint_name");
                        String tableName = rs.getString("table_name");
                        String dropSql = "ALTER TABLE " + schemaName + "." + tableName
                                + " DROP CONSTRAINT IF EXISTS " + constraintName;
                        conn.createStatement().execute(dropSql);
                        log.info("[Tenant] Dropped misrouted FK '{}' on {}.{} (was pointing to public schema)",
                                constraintName, schemaName, tableName);
                    }
                }
            }
        } catch (SQLException e) {
            log.warn("[Tenant] Could not clean up misrouted FKs for schema '{}': {}", schemaName, e.getMessage());
        }
    }

    /**
     * Deletes all public-schema rows belonging to the given company IDs.
     *
     * Uses the same JDBC savepoint retry strategy as cleanupTenantDataForCompanies:
     * discovers every table in the public schema that has a company_id column and
     * deletes from them in FK-safe order. Join tables (no company_id, FK to a
     * company-owned public table) are cleaned first.
     *
     * Call this BEFORE deleting rows from public.companies.
     */
    public void cleanupPublicSchemaDataForCompanies(List<Long> companyIds) {
        if (companyIds.isEmpty()) return;
        String ids = companyIds.stream().map(String::valueOf).collect(Collectors.joining(","));

        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);
            try {
                // Step 1 — tables in public schema with company_id (excluding companies itself).
                // Uses pg_catalog (fast) instead of information_schema (slow catalog views).
                List<String> companyTables = new ArrayList<>();
                try (var ps = conn.prepareStatement(
                        "SELECT c.relname FROM pg_attribute a " +
                        "JOIN pg_class c ON c.oid = a.attrelid " +
                        "JOIN pg_namespace n ON n.oid = c.relnamespace " +
                        "WHERE n.nspname = 'public' AND a.attname = 'company_id' " +
                        "  AND a.attnum > 0 AND NOT a.attisdropped " +
                        "  AND c.relkind = 'r' AND c.relname != 'companies' " +
                        "ORDER BY c.relname")) {
                    try (var rs = ps.executeQuery()) {
                        while (rs.next()) companyTables.add(rs.getString(1));
                    }
                }
                if (companyTables.isEmpty()) { conn.commit(); return; }

                // Step 1b — null out self-referential FK columns in company-owned tables.
                // Example: employees.reporting_manager_id → employees.id.
                // Uses pg_catalog for speed instead of information_schema.
                String selfRefSql =
                    "SELECT src.relname AS table_name, a.attname AS column_name " +
                    "FROM pg_constraint con " +
                    "JOIN pg_class src ON src.oid = con.conrelid " +
                    "JOIN pg_class ref ON ref.oid = con.confrelid " +
                    "JOIN pg_namespace n ON n.oid = src.relnamespace " +
                    "JOIN pg_attribute a ON a.attrelid = src.oid AND a.attnum = con.conkey[1] " +
                    "WHERE con.contype = 'f' AND n.nspname = 'public' " +
                    "  AND src.oid = ref.oid " +   // self-referential: same table
                    "  AND src.relname = ANY(?)";
                var ctArrSelf = conn.createArrayOf("text", companyTables.toArray());
                try (var ps = conn.prepareStatement(selfRefSql)) {
                    ps.setArray(1, ctArrSelf);
                    try (var rs = ps.executeQuery()) {
                        while (rs.next()) {
                            String table  = rs.getString("table_name");
                            String column = rs.getString("column_name");
                            // Pass 1: nullify within the company (fast, company_id indexed)
                            String sql = "UPDATE public." + table + " SET " + column +
                                         " = NULL WHERE company_id IN (" + ids + ")";
                            Savepoint sp = conn.setSavepoint();
                            try {
                                conn.createStatement().execute(sql);
                                conn.releaseSavepoint(sp);
                                log.debug("[Public] Nulled self-ref FK {}.{}", table, column);
                            } catch (SQLException e) {
                                conn.rollback(sp);
                                log.warn("[Public] Could not null self-ref FK {}.{}: {}", table, column, e.getMessage());
                            }
                            // Pass 2: nullify cross-company rows that reference the deleted employees.
                            // e.g. employee 4 (company 6) has reporting_manager_id → employee 2 (company 12).
                            // Pass 1 does NOT cover this because employee 4 is in a different company.
                            String crossSql = "UPDATE public." + table + " SET " + column +
                                    " = NULL WHERE " + column +
                                    " IN (SELECT id FROM public." + table + " WHERE company_id IN (" + ids + "))";
                            Savepoint sp2 = conn.setSavepoint();
                            try {
                                conn.createStatement().execute(crossSql);
                                conn.releaseSavepoint(sp2);
                                log.debug("[Public] Nulled cross-company self-ref FK {}.{}", table, column);
                            } catch (SQLException e) {
                                conn.rollback(sp2);
                                log.debug("[Public] Cross-company self-ref null skipped {}.{}: {}", table, column, e.getMessage());
                            }
                        }
                    }
                }

                // Step 2 — Multi-level join table cleanup via BFS from company-owned tables.
                //
                // Uses ACTUAL ID fetching (not nested SQL subqueries) to avoid failures on
                // M2M join tables that have no 'id' column (composite PK only).
                //
                // Algorithm:
                //   a) Load all FK edges in the public schema: parentTable → [(childTable, childFkCol)]
                //   b) Fetch the actual row IDs for each company-owned table into Java lists.
                //   c) BFS outward from company-owned tables. For each non-company child found,
                //      build DELETE using the parent's literal ID list (no subquery nesting).
                //      Try to also fetch the child's IDs (for further BFS expansion); if the
                //      child table has no 'id' column (M2M leaf), skip BFS expansion silently.
                //   d) Delete in REVERSE BFS order — deepest (most leaf-like) tables first.

                // 2a: Load all FK edges within the public schema using pg_catalog.
                //     pg_catalog is an order of magnitude faster than information_schema views.
                // Map: parentTable → list of [childTable, childFkCol]
                Map<String, List<String[]>> fkEdges = new HashMap<>();
                String edgeSql =
                    "SELECT src.relname AS child_t, a_src.attname AS child_col, " +
                    "       ref.relname AS parent_t " +
                    "FROM pg_constraint con " +
                    "JOIN pg_class src ON src.oid = con.conrelid " +
                    "JOIN pg_class ref ON ref.oid = con.confrelid " +
                    "JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace " +
                    "JOIN pg_namespace ref_ns ON ref_ns.oid = ref.relnamespace " +
                    "JOIN pg_attribute a_src ON a_src.attrelid = src.oid AND a_src.attnum = con.conkey[1] " +
                    "WHERE con.contype = 'f' " +
                    "  AND src_ns.nspname = 'public' AND ref_ns.nspname = 'public' " +
                    "  AND src.relname != ref.relname";
                try (var ps = conn.prepareStatement(edgeSql);
                     var rs = ps.executeQuery()) {
                    while (rs.next()) {
                        fkEdges.computeIfAbsent(rs.getString("parent_t"), k -> new ArrayList<>())
                               .add(new String[]{rs.getString("child_t"), rs.getString("child_col")});
                    }
                }

                // 2b: Pre-fetch which public-schema tables have an 'id' column (pg_catalog).
                //     Needed before any SELECT/DELETE — querying "SELECT id FROM t" on a
                //     table without 'id' raises a SQLException that aborts the whole PG
                //     transaction, making all subsequent savepointed DELETEs fail silently.
                Set<String> tablesWithId = new HashSet<>();
                try (var ps = conn.prepareStatement(
                        "SELECT c.relname FROM pg_attribute a " +
                        "JOIN pg_class c ON c.oid = a.attrelid " +
                        "JOIN pg_namespace n ON n.oid = c.relnamespace " +
                        "WHERE n.nspname = 'public' AND a.attname = 'id' " +
                        "  AND a.attnum > 0 AND NOT a.attisdropped AND c.relkind = 'r'");
                     var rs = ps.executeQuery()) {
                    while (rs.next()) tablesWithId.add(rs.getString(1));
                }

                // 2c: Fetch actual IDs for each company-owned table that has an id column.
                //     Map: tableName → comma-separated id list (empty string = no rows / no id col)
                Map<String, String> tableIdLists = new HashMap<>();
                for (String parentTable : companyTables) {
                    if (!tablesWithId.contains(parentTable)) {
                        tableIdLists.put(parentTable, "");
                        continue;
                    }
                    try (var ps = conn.prepareStatement(
                            "SELECT id FROM public." + parentTable + " WHERE company_id IN (" + ids + ")");
                         var rs = ps.executeQuery()) {
                        StringBuilder sb = new StringBuilder();
                        while (rs.next()) {
                            if (sb.length() > 0) sb.append(',');
                            sb.append(rs.getLong(1));
                        }
                        tableIdLists.put(parentTable, sb.toString());
                    }
                }

                // 2d: BFS — expand from company-owned tables to discover ALL FK dependents.
                //
                // Root cause of previous failures: company-owned tables were pre-added to
                // visitedJoin, so when the BFS found them as FK children of other company
                // tables, it skipped exploring THEIR children. This left non-company
                // grandchildren (e.g. leave_request_approvals → leave_requests → employees)
                // undiscovered and un-deleted, causing the employees DELETE to fail.
                //
                // Fix: use two separate sets —
                //   expandedSet: tables we have already queued for BFS expansion (prevents loops)
                //   deleteSet:   non-company tables we have generated a DELETE for (prevents dups)
                //
                // When a company-owned table is found as a FK child, we enqueue it for BFS
                // expansion (so its grandchildren are discovered) but do NOT add a DELETE for it
                // here — Step 3 handles company tables via the company_id filter.

                Set<String> companySet = new HashSet<>(companyTables);
                Set<String> expandedSet = new HashSet<>(companyTables); // already in queue
                Set<String> deleteSet   = new HashSet<>();               // non-company DELETEs generated
                List<String[]> joinDeleteList = new ArrayList<>();       // [table, deleteSql], BFS order
                Queue<String> bfsQueue = new ArrayDeque<>(companyTables);

                while (!bfsQueue.isEmpty()) {
                    String curTable = bfsQueue.poll();
                    String parentIds = tableIdLists.getOrDefault(curTable, "");
                    if (parentIds.isEmpty()) continue;

                    for (String[] edge : fkEdges.getOrDefault(curTable, List.of())) {
                        String childT = edge[0], childCol = edge[1];

                        if (companySet.contains(childT)) {
                            // Company-owned FK child: enqueue for BFS expansion so ITS children
                            // are discovered, but don't generate a DELETE (Step 3 handles it).
                            if (expandedSet.add(childT)) {
                                bfsQueue.add(childT);
                            }
                            // ALSO nullify cross-company references via this FK column.
                            // Step 3 deletes childT rows WHERE company_id IN (...) — it will NOT
                            // touch rows in OTHER companies that reference these parent IDs.
                            // e.g. employee_work_information (company 6).reporting_manager_id → employees (company 12)
                            // We nullify them here so the parent (employees) can be deleted cleanly.
                            Savepoint spCross = conn.setSavepoint();
                            try {
                                conn.createStatement().execute(
                                    "UPDATE public." + childT + " SET " + childCol +
                                    " = NULL WHERE " + childCol + " IN (" + parentIds + ")");
                                conn.releaseSavepoint(spCross);
                                log.debug("[Public] Nulled cross-company FK {}.{} → {}", childT, childCol, curTable);
                            } catch (SQLException ex) {
                                conn.rollback(spCross);
                                log.debug("[Public] Could not null cross-company FK {}.{}: {}", childT, childCol, ex.getMessage());
                            }
                            continue;
                        }

                        // Non-company FK child: generate DELETE using parent's literal IDs.
                        if (!deleteSet.add(childT)) continue; // already scheduled

                        String delSql = "DELETE FROM public." + childT +
                                        " WHERE " + childCol + " IN (" + parentIds + ")";
                        joinDeleteList.add(new String[]{childT, delSql});

                        // Fetch child IDs for further BFS expansion (only if it has an id col).
                        // M2M tables without an id column are leaf nodes — skip expansion.
                        if (!tablesWithId.contains(childT)) continue;

                        try (var ps = conn.prepareStatement(
                                "SELECT id FROM public." + childT +
                                " WHERE " + childCol + " IN (" + parentIds + ")");
                             var rs = ps.executeQuery()) {
                            StringBuilder sb = new StringBuilder();
                            while (rs.next()) {
                                if (sb.length() > 0) sb.append(',');
                                sb.append(rs.getLong(1));
                            }
                            String childIdList = sb.toString();
                            if (!childIdList.isEmpty()) {
                                tableIdLists.put(childT, childIdList);
                                if (expandedSet.add(childT)) bfsQueue.add(childT);
                            }
                        }
                    }
                }

                // 2e: delete non-company tables deepest first (reverse BFS order)
                Collections.reverse(joinDeleteList);
                for (String[] entry : joinDeleteList) {
                    Savepoint sp = conn.setSavepoint();
                    try {
                        conn.createStatement().execute(entry[1]);
                        conn.releaseSavepoint(sp);
                        log.debug("[Public] Deleted FK dependents from {}", entry[0]);
                    } catch (SQLException e) {
                        conn.rollback(sp);
                        log.warn("[Public] Join-table cleanup skipped for '{}': {}", entry[0], e.getMessage());
                    }
                }

                // Step 3 — retry loop for company-owned tables (company_id filter).
                // All non-company FK dependents were deleted above, so each pass should
                // make progress; after N passes every company table should be gone.
                List<String> remaining = new ArrayList<>(companyTables);
                for (int pass = 0; pass <= remaining.size() && !remaining.isEmpty(); pass++) {
                    List<String> retry = new ArrayList<>();
                    for (String table : remaining) {
                        Savepoint sp = conn.setSavepoint();
                        try {
                            conn.createStatement().execute(
                                "DELETE FROM public." + table + " WHERE company_id IN (" + ids + ")");
                            conn.releaseSavepoint(sp);
                        } catch (SQLException e) {
                            conn.rollback(sp);
                            log.debug("[Public] Retry queued for '{}': {}", table, e.getMessage());
                            retry.add(table);
                        }
                    }
                    remaining = retry;
                }
                if (!remaining.isEmpty()) {
                    log.warn("[Public] Could not clean up tables (unresolved FK): {}", remaining);
                }

                conn.commit();
                log.info("[Public] Cleaned up public-schema data for companies {}", companyIds);
            } catch (Exception e) {
                conn.rollback();
                throw new RuntimeException("Public schema cleanup failed for companies=" + companyIds, e);
            }
        } catch (SQLException e) {
            throw new RuntimeException("DB connection error during public schema cleanup", e);
        }
    }

    /**
     * Fire-and-forget version of dropSchema — returns immediately, drops in a background thread.
     * Use this from HTTP request handlers so the 5-15 s DROP SCHEMA CASCADE does not block the response.
     */
    @Async
    public void dropSchemaAsync(String schemaName) {
        try {
            dropSchema(schemaName);
        } catch (Exception e) {
            log.error("[Tenant] Background schema drop failed for '{}': {}", schemaName, e.getMessage(), e);
        }
    }

    /**
     * Drops a tenant schema and all its tables/data (CASCADE).
     * Used when an entire organization is permanently deleted.
     */
    public void dropSchema(String schemaName) {
        validateSchemaName(schemaName);
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(true);
            conn.createStatement().execute("DROP SCHEMA IF EXISTS " + schemaName + " CASCADE");
            log.info("[Tenant] Dropped schema: {}", schemaName);
        } catch (SQLException e) {
            throw new RuntimeException("Failed to drop schema: " + schemaName, e);
        }
    }

    /**
     * Deletes all tenant-schema data belonging to the given company IDs, in correct FK order.
     *
     * Algorithm:
     *   1. Discover all tables in this schema with a company_id column.
     *   2. Discover "join tables" (no company_id, but FK to a company-owned table) and delete
     *      from them first via subqueries so their parent rows become deletable.
     *   3. Delete from company-owned tables using a retry loop with JDBC savepoints:
     *      tables that fail due to FK violations from other company tables are deferred to
     *      later passes, naturally resolving inter-table dependencies.
     */
    public void cleanupTenantDataForCompanies(String schemaName, List<Long> companyIds) {
        if (companyIds.isEmpty()) return;
        validateSchemaName(schemaName);

        String ids = companyIds.stream().map(String::valueOf).collect(Collectors.joining(","));

        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);
            try {
                conn.createStatement().execute("SET search_path TO " + schemaName + ", public");

                // Step 1 — tables with company_id
                List<String> companyTables = new ArrayList<>();
                try (var ps = conn.prepareStatement(
                        "SELECT table_name FROM information_schema.columns " +
                        "WHERE table_schema = ? AND column_name = 'company_id' ORDER BY table_name")) {
                    ps.setString(1, schemaName);
                    try (var rs = ps.executeQuery()) {
                        while (rs.next()) companyTables.add(rs.getString(1));
                    }
                }
                if (companyTables.isEmpty()) { conn.commit(); return; }

                // Step 1b — null out self-referential FK columns so bulk DELETE can succeed.
                String selfRefTenantSql =
                    "SELECT c1.table_name, c1.column_name " +
                    "FROM information_schema.referential_constraints rc " +
                    "JOIN information_schema.key_column_usage c1 " +
                    "  ON rc.constraint_name = c1.constraint_name AND rc.constraint_schema = c1.table_schema " +
                    "JOIN information_schema.key_column_usage c2 " +
                    "  ON rc.unique_constraint_name = c2.constraint_name " +
                    "  AND rc.unique_constraint_schema = c2.table_schema " +
                    "WHERE rc.constraint_schema = ? " +
                    "  AND c1.table_schema = ? " +
                    "  AND c1.table_name = c2.table_name " +
                    "  AND c1.table_name = ANY(?)";
                var ctArrSelfT = conn.createArrayOf("text", companyTables.toArray());
                try (var ps = conn.prepareStatement(selfRefTenantSql)) {
                    ps.setString(1, schemaName);
                    ps.setString(2, schemaName);
                    ps.setArray(3, ctArrSelfT);
                    try (var rs = ps.executeQuery()) {
                        while (rs.next()) {
                            String table  = rs.getString("table_name");
                            String column = rs.getString("column_name");
                            String sql = "UPDATE " + table + " SET " + column +
                                         " = NULL WHERE company_id IN (" + ids + ")";
                            Savepoint sp = conn.setSavepoint();
                            try {
                                conn.createStatement().execute(sql);
                                conn.releaseSavepoint(sp);
                            } catch (SQLException e) {
                                conn.rollback(sp);
                                log.warn("[Tenant] Could not null self-ref FK {}.{}: {}", table, column, e.getMessage());
                            }
                        }
                    }
                }

                // Step 2 — find join tables and their FK mappings to company-owned tables
                String fkSql =
                    "SELECT c1.table_name, c1.column_name, c2.table_name AS parent_t, c2.column_name AS parent_c " +
                    "FROM information_schema.referential_constraints rc " +
                    "JOIN information_schema.key_column_usage c1 " +
                    "  ON rc.constraint_name = c1.constraint_name AND rc.constraint_schema = c1.table_schema " +
                    "JOIN information_schema.key_column_usage c2 " +
                    "  ON rc.unique_constraint_name = c2.constraint_name " +
                    "  AND rc.unique_constraint_schema = c2.table_schema " +
                    "  AND c2.ordinal_position = c1.position_in_unique_constraint " +
                    "WHERE rc.constraint_schema = ? " +
                    "  AND c2.table_schema = ? " +
                    "  AND c2.table_name = ANY(?) " +
                    "  AND c1.table_name != ALL(?)";

                var ctArr = conn.createArrayOf("text", companyTables.toArray());
                try (var ps = conn.prepareStatement(fkSql)) {
                    ps.setString(1, schemaName);
                    ps.setString(2, schemaName);
                    ps.setArray(3, ctArr);
                    ps.setArray(4, ctArr);
                    try (var rs = ps.executeQuery()) {
                        while (rs.next()) {
                            String joinTable = rs.getString(1);
                            String joinCol   = rs.getString(2);
                            String parentT   = rs.getString("parent_t");
                            String parentC   = rs.getString("parent_c");
                            String sql = String.format(
                                "DELETE FROM %s WHERE %s IN (SELECT %s FROM %s WHERE company_id IN (%s))",
                                joinTable, joinCol, parentC, parentT, ids);
                            Savepoint sp = conn.setSavepoint();
                            try {
                                conn.createStatement().execute(sql);
                                conn.releaseSavepoint(sp);
                            } catch (SQLException e) {
                                conn.rollback(sp);
                                log.warn("[Tenant] Join-table cleanup skipped for {}: {}", joinTable, e.getMessage());
                            }
                        }
                    }
                }

                // Step 3 — retry loop: delete from each company-owned table;
                // failures due to intra-schema FK violations are retried in subsequent passes.
                List<String> remaining = new ArrayList<>(companyTables);
                for (int pass = 0; pass <= remaining.size() && !remaining.isEmpty(); pass++) {
                    List<String> retry = new ArrayList<>();
                    for (String table : remaining) {
                        Savepoint sp = conn.setSavepoint();
                        try {
                            conn.createStatement().execute(
                                "DELETE FROM " + table + " WHERE company_id IN (" + ids + ")");
                            conn.releaseSavepoint(sp);
                        } catch (SQLException e) {
                            conn.rollback(sp);
                            retry.add(table);
                        }
                    }
                    remaining = retry;
                }
                if (!remaining.isEmpty()) {
                    log.warn("[Tenant] Could not clean up tables (unresolved FK): {}", remaining);
                }

                conn.commit();
                log.info("[Tenant] Cleaned up data for companies {} in schema {}", companyIds, schemaName);
            } catch (Exception e) {
                conn.rollback();
                throw new RuntimeException(
                    "Tenant data cleanup failed for schema=" + schemaName + " companies=" + companyIds, e);
            }
        } catch (SQLException e) {
            throw new RuntimeException("DB connection error during tenant data cleanup", e);
        }
    }

    /**
     * Cleans up every company-owned row (employees, departments, etc. — any table with a
     * {@code company_id} column) in every OTHER tenant schema (i.e. schemas NOT in
     * {@code ownSchemas}) that references one of the given company IDs.
     *
     * Background: every tenant schema has its own copies of company-owned tables
     * (employees, departments, ...) each with a {@code company_id} FK into
     * {@code public.companies}. When an organisation is deleted its own schema is dropped
     * via CASCADE, but sibling tenant schemas can hold orphaned rows — e.g. test data or an
     * import — that happen to reference the same company IDs. Those rows would otherwise
     * block the {@code DELETE FROM public.companies} with an FK violation (previously this
     * only cleaned the {@code employees} table, missing {@code departments} and any other
     * company-owned table, which is exactly the case that surfaces this violation).
     *
     * Reuses {@link #cleanupTenantDataForCompanies} per foreign schema, which already
     * discovers every company-owned table and deletes in FK-safe order.
     */
    public void cleanupCrossSchemaCompanyReferences(List<Long> companyIds, List<String> ownSchemas) {
        if (companyIds.isEmpty()) return;
        Set<String> ownSet = new HashSet<>(ownSchemas);

        List<String> tenantSchemas = new ArrayList<>();
        try (Connection conn = dataSource.getConnection()) {
            // Discover all tenant schemas (excludes pg_catalog, information_schema, public)
            try (var ps = conn.prepareStatement(
                    "SELECT nspname FROM pg_namespace " +
                    "WHERE nspname NOT IN ('public','pg_catalog','information_schema') " +
                    "  AND nspname NOT LIKE 'pg_%' " +
                    "ORDER BY nspname");
                 var rs = ps.executeQuery()) {
                while (rs.next()) tenantSchemas.add(rs.getString(1));
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to discover tenant schemas", e);
        }

        for (String schema : tenantSchemas) {
            if (ownSet.contains(schema)) continue; // already dropped by caller
            try {
                cleanupTenantDataForCompanies(schema, companyIds);
            } catch (Exception e) {
                log.warn("[CrossSchema] Could not clean up schema={} for companies={}: {}", schema, companyIds, e.getMessage());
            }
        }
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
