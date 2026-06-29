-- V4: Add is_holiday column to attendances table
-- Existing rows will default to FALSE so Hibernate can map them without NPE.

ALTER TABLE attendances
    ADD COLUMN IF NOT EXISTS is_holiday BOOLEAN NOT NULL DEFAULT FALSE;
