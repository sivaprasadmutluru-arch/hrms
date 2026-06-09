-- ============================================================
-- Migration: Shift Allocation Logic
-- Date: 2026-06-09
-- DB:   PostgreSQL
-- ============================================================
-- Changes:
--   1. shift_requests         → 5 new columns
--   2. rotating_shifts        → 1 new column; shift1_id/shift2_id FK retargeted to shift_schedules
--   3. rotating_shift_assigns → 1 new column; current_shift_id/next_shift_id FK retargeted to shift_schedules
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. shift_requests — new columns
-- ─────────────────────────────────────────────────────────────

ALTER TABLE shift_requests
    ADD COLUMN IF NOT EXISTS shift_changed      BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS reallocate_to_id   BIGINT,
    ADD COLUMN IF NOT EXISTS reallocate_approved  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reallocate_canceled  BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: any existing APPROVED rows are considered active
UPDATE shift_requests
SET is_active = TRUE
WHERE status = 'APPROVED';

-- FK for reallocate_to_id → employees
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'shift_requests'
          AND constraint_name = 'fk_shift_requests_reallocate_to'
    ) THEN
        ALTER TABLE shift_requests
            ADD CONSTRAINT fk_shift_requests_reallocate_to
            FOREIGN KEY (reallocate_to_id) REFERENCES employees(id);
    END IF;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 2. rotating_shifts — retarget shift1_id / shift2_id FKs
--    and add additional_shift_ids column
-- ─────────────────────────────────────────────────────────────

ALTER TABLE rotating_shifts
    ADD COLUMN IF NOT EXISTS additional_shift_ids TEXT;

-- Drop existing FK constraints on shift1_id and shift2_id
-- (Hibernate generates hash-based names, so we look them up dynamically)
DO $$
DECLARE
    v_constraint TEXT;
BEGIN
    -- Drop all FKs on rotating_shifts.shift1_id
    FOR v_constraint IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_name      = kcu.table_name
        WHERE tc.table_name       = 'rotating_shifts'
          AND tc.constraint_type  = 'FOREIGN KEY'
          AND kcu.column_name     = 'shift1_id'
    LOOP
        EXECUTE 'ALTER TABLE rotating_shifts DROP CONSTRAINT IF EXISTS "' || v_constraint || '"';
    END LOOP;

    -- Drop all FKs on rotating_shifts.shift2_id
    FOR v_constraint IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_name      = kcu.table_name
        WHERE tc.table_name       = 'rotating_shifts'
          AND tc.constraint_type  = 'FOREIGN KEY'
          AND kcu.column_name     = 'shift2_id'
    LOOP
        EXECUTE 'ALTER TABLE rotating_shifts DROP CONSTRAINT IF EXISTS "' || v_constraint || '"';
    END LOOP;
END $$;

-- Migrate existing data: map employee_shifts.name → shift_schedules.id by name match
-- Rows with no name match are set to NULL (safe — FK will allow NULL)
UPDATE rotating_shifts rs
SET shift1_id = (
    SELECT ss.id FROM shift_schedules ss
    JOIN employee_shifts es ON LOWER(es.name) = LOWER(ss.name)
    WHERE es.id = rs.shift1_id
    LIMIT 1
)
WHERE rs.shift1_id IS NOT NULL;

UPDATE rotating_shifts rs
SET shift2_id = (
    SELECT ss.id FROM shift_schedules ss
    JOIN employee_shifts es ON LOWER(es.name) = LOWER(ss.name)
    WHERE es.id = rs.shift2_id
    LIMIT 1
)
WHERE rs.shift2_id IS NOT NULL;

-- Add new FK constraints pointing to shift_schedules
ALTER TABLE rotating_shifts
    ADD CONSTRAINT fk_rotating_shifts_shift1 FOREIGN KEY (shift1_id) REFERENCES shift_schedules(id),
    ADD CONSTRAINT fk_rotating_shifts_shift2 FOREIGN KEY (shift2_id) REFERENCES shift_schedules(id);


-- ─────────────────────────────────────────────────────────────
-- 3. rotating_shift_assigns — retarget current_shift_id / next_shift_id FKs
--    and add next_shift_index column
-- ─────────────────────────────────────────────────────────────

ALTER TABLE rotating_shift_assigns
    ADD COLUMN IF NOT EXISTS next_shift_index INTEGER NOT NULL DEFAULT 0;

-- Drop existing FK constraints on current_shift_id and next_shift_id
DO $$
DECLARE
    v_constraint TEXT;
BEGIN
    FOR v_constraint IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_name      = kcu.table_name
        WHERE tc.table_name       = 'rotating_shift_assigns'
          AND tc.constraint_type  = 'FOREIGN KEY'
          AND kcu.column_name     IN ('current_shift_id', 'next_shift_id')
    LOOP
        EXECUTE 'ALTER TABLE rotating_shift_assigns DROP CONSTRAINT IF EXISTS "' || v_constraint || '"';
    END LOOP;
END $$;

-- Migrate existing data: map employee_shifts → shift_schedules by name
UPDATE rotating_shift_assigns rsa
SET current_shift_id = (
    SELECT ss.id FROM shift_schedules ss
    JOIN employee_shifts es ON LOWER(es.name) = LOWER(ss.name)
    WHERE es.id = rsa.current_shift_id
    LIMIT 1
)
WHERE rsa.current_shift_id IS NOT NULL;

UPDATE rotating_shift_assigns rsa
SET next_shift_id = (
    SELECT ss.id FROM shift_schedules ss
    JOIN employee_shifts es ON LOWER(es.name) = LOWER(ss.name)
    WHERE es.id = rsa.next_shift_id
    LIMIT 1
)
WHERE rsa.next_shift_id IS NOT NULL;

-- Backfill next_shift_index: assign index 1 (next rotation will apply shift2)
-- for all existing assignments (they are already at index 0 = current)
UPDATE rotating_shift_assigns
SET next_shift_index = 1
WHERE next_shift_index = 0;

-- Add new FK constraints pointing to shift_schedules
ALTER TABLE rotating_shift_assigns
    ADD CONSTRAINT fk_rsa_current_shift FOREIGN KEY (current_shift_id) REFERENCES shift_schedules(id),
    ADD CONSTRAINT fk_rsa_next_shift    FOREIGN KEY (next_shift_id)    REFERENCES shift_schedules(id);


-- ─────────────────────────────────────────────────────────────
-- Verify: warn about unmapped rows (data that could not be migrated)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_count INT;
BEGIN
    -- rotating_shifts with no shift1 match
    SELECT COUNT(*) INTO v_count
    FROM rotating_shifts
    WHERE shift1_id IS NULL OR shift2_id IS NULL;
    IF v_count > 0 THEN
        RAISE WARNING 'rotating_shifts: % rows have NULL shift1_id or shift2_id after migration — '
                      'these had no matching name in shift_schedules and must be fixed manually.', v_count;
    END IF;

    -- rotating_shift_assigns with no current_shift match
    SELECT COUNT(*) INTO v_count
    FROM rotating_shift_assigns
    WHERE current_shift_id IS NULL OR next_shift_id IS NULL;
    IF v_count > 0 THEN
        RAISE WARNING 'rotating_shift_assigns: % rows have NULL current_shift_id or next_shift_id after migration — '
                      'must be fixed manually.', v_count;
    END IF;
END $$;

COMMIT;
