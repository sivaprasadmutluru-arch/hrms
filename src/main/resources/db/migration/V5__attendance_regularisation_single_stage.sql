-- V5: Attendance regularisation single-stage approval
--
-- The regularisation workflow moved from a two-stage Manager -> HR approval
-- to a single stage approved directly by an Admin/HR Manager. Existing rows
-- created under the old workflow use RequestStatus values that no longer
-- exist in the Java enum (PENDING_MANAGER, APPROVED_BY_MANAGER, PENDING_HR)
-- and must be backfilled to PENDING before the new backend jar is deployed,
-- otherwise those rows will fail to deserialize (EnumType.STRING throws on
-- an unrecognised value).
--
-- !! IMPORTANT: This script must be run ONCE PER TENANT SCHEMA, same as V3 !!
--
--   psql -U postgres -d your_db \
--     -c "SET search_path TO akhil_deploys, public;" \
--     -f V5__attendance_regularisation_single_stage.sql
--
--   Then repeat for prabha_tech, yuwa_tech_solutions, etc.
--
-- Run this BEFORE deploying the new backend jar to that tenant.

UPDATE attendance_regularisation_requests
SET status = 'PENDING'
WHERE status IN ('PENDING_MANAGER', 'APPROVED_BY_MANAGER', 'PENDING_HR');
