-- ============================================================
-- Migration: Add exclude_weekend to leave_types
-- Date: 2026-06-18
-- DB:   PostgreSQL
-- ============================================================
-- Changes:
--   1. leave_types → add exclude_weekend column (default TRUE)
--      When TRUE, Saturdays and Sundays are excluded from the
--      leave day count for that leave type.
-- ============================================================

BEGIN;

ALTER TABLE leave_types
    ADD COLUMN IF NOT EXISTS exclude_weekend BOOLEAN NOT NULL DEFAULT TRUE;

COMMIT;
