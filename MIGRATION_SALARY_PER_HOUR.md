# Migration: Add `salary_per_hour` Column to `contracts` Table

## Overview

This document describes the database migration required to add the `salary_per_hour`
column to the `contracts` table across all company schemas in the live PostgreSQL database.

---

## Background

### Why this migration is needed

The `Contract` entity (`Contract.java`) was updated to include a new field:

```java
@Column(name = "salary_per_hour", precision = 12, scale = 4)
private BigDecimal salaryPerHour;
```

This supports hourly wage calculations in payroll processing. Without this column
present in the database, any payroll operation involving `WageType.HOURLY` contracts
will fail at runtime.

### Why it cannot be skipped

The project uses `spring.jpa.hibernate.ddl-auto=update`. Hibernate will attempt to
add the column automatically on app startup — **but this is unreliable in production**
and has been observed to miss schema-qualified tables in multi-tenant setups. Manual
migration is the safe and recommended approach.

### Local fix already applied

The column was already added manually to the local dev schema:

```sql
ALTER TABLE akhil_deploys.contracts ADD COLUMN IF NOT EXISTS salary_per_hour NUMERIC(12,4);
```

---

## Multi-Tenant Architecture

This project uses **one PostgreSQL schema per company**. Each company onboarded to the
platform gets its own schema (e.g., `akhil_deploys`, `company_xyz`, etc.). The
`contracts` table exists independently in every schema.

This means the migration must be applied to **every company schema** on the live database.

---

## Pre-Migration Checklist

Before running any SQL on the live database:

- [ ] Take a full database backup
- [ ] Confirm you are connected to the **live/production** PostgreSQL instance
- [ ] Verify the current branch deployed is `hrms-backend` (with the updated `Contract.java`)
- [ ] Run the preview query below to confirm which schemas will be affected
- [ ] Schedule during a low-traffic window if possible

---

## Step 1 — Preview Affected Schemas

Run this query first to see all company schemas that will be migrated:

```sql
SELECT nspname AS schema_name
FROM pg_namespace
WHERE nspname NOT IN ('public', 'pg_catalog', 'information_schema')
  AND nspname NOT LIKE 'pg_%'
ORDER BY nspname;
```

Review the output. Every schema listed represents a company tenant. Confirm this list
looks correct before proceeding.

---

## Step 2 — Check Which Schemas Already Have the Column

To see which schemas already have `salary_per_hour` (e.g., `akhil_deploys` from the
local fix), run:

```sql
SELECT table_schema, column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'contracts'
  AND column_name = 'salary_per_hour'
ORDER BY table_schema;
```

Schemas appearing in this result already have the column. The migration script is
safe to run on them too (uses `IF NOT EXISTS`), but this gives you visibility.

---

## Step 3 — Run the Migration

This script loops through every company schema and adds the column. It is **idempotent**
— safe to run multiple times. Schemas that already have the column will be skipped
silently.

```sql
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT nspname AS schema_name
        FROM pg_namespace
        WHERE nspname NOT IN ('public', 'pg_catalog', 'information_schema')
          AND nspname NOT LIKE 'pg_%'
        ORDER BY nspname
    LOOP
        -- Only apply to schemas that actually have a contracts table
        IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = r.schema_name
              AND table_name = 'contracts'
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.contracts ADD COLUMN IF NOT EXISTS salary_per_hour NUMERIC(12,4)',
                r.schema_name
            );
            RAISE NOTICE 'Migrated schema: %', r.schema_name;
        ELSE
            RAISE NOTICE 'Skipped (no contracts table): %', r.schema_name;
        END IF;
    END LOOP;
END;
$$;
```

### What this script does

| Step | Action |
|------|--------|
| Loops schemas | Iterates every non-system schema in the database |
| Checks for table | Only runs ALTER on schemas that have a `contracts` table |
| Adds column | `salary_per_hour NUMERIC(12,4)` — matches the JPA entity definition |
| IF NOT EXISTS | Skips safely if column already exists |
| RAISE NOTICE | Prints progress for each schema processed |

---

## Step 4 — Verify the Migration

After running, confirm the column exists in all expected schemas:

```sql
SELECT
    t.table_schema,
    CASE
        WHEN c.column_name IS NOT NULL THEN 'OK - column exists'
        ELSE 'MISSING - migration failed'
    END AS status
FROM (
    SELECT table_schema
    FROM information_schema.tables
    WHERE table_name = 'contracts'
      AND table_schema NOT IN ('public', 'pg_catalog', 'information_schema')
) t
LEFT JOIN information_schema.columns c
    ON c.table_schema = t.table_schema
    AND c.table_name = 'contracts'
    AND c.column_name = 'salary_per_hour'
ORDER BY t.table_schema;
```

Every row should show `OK - column exists`. If any show `MISSING`, re-run the
migration script for that specific schema:

```sql
ALTER TABLE <schema_name>.contracts
ADD COLUMN IF NOT EXISTS salary_per_hour NUMERIC(12,4);
```

---

## Step 5 — Restart the Application

After the migration completes, restart the Spring Boot application so Hibernate
re-validates the schema against the updated entity. This ensures no stale session
factory state.

```bash
# Example — adjust to your deployment setup
sudo systemctl restart hrms-app
# or
./restart.sh
```

---

## Rollback

If you need to undo this migration (e.g., due to a bad deploy), drop the column from
all schemas:

```sql
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT nspname AS schema_name
        FROM pg_namespace
        WHERE nspname NOT IN ('public', 'pg_catalog', 'information_schema')
          AND nspname NOT LIKE 'pg_%'
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = r.schema_name
              AND table_name = 'contracts'
              AND column_name = 'salary_per_hour'
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.contracts DROP COLUMN salary_per_hour',
                r.schema_name
            );
            RAISE NOTICE 'Rolled back schema: %', r.schema_name;
        END IF;
    END LOOP;
END;
$$;
```

> **Warning:** Dropping a column is destructive. Only do this if the app code has
> also been reverted to a version that does not reference `salaryPerHour`.

---

## Column Specification

| Property | Value |
|----------|-------|
| Column name | `salary_per_hour` |
| Data type | `NUMERIC(12, 4)` |
| Nullable | Yes (no `NOT NULL` constraint) |
| Default | None |
| JPA field | `Contract.salaryPerHour` (`BigDecimal`) |
| Used by | `PayrollService` — hourly wage calculation |

---

## Notes

- This project has no Flyway/Liquibase migration tooling. All schema changes must be
  applied manually to the live database. Consider adding Flyway to automate and track
  migrations going forward.
- The `IF NOT EXISTS` guard makes every statement in this migration safe to re-run.
- Always back up before running DDL on a live database.
