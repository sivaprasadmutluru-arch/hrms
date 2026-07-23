-- EMP-004: offboarding retention/leaver tracking, and unblocking the "Start Offboarding" flow,
-- which was previously impossible to complete since task_id was NOT NULL with no way to populate it.
-- New columns are added automatically per-schema by Hibernate ddl-auto=update on next boot
-- (via TenantSchemaSyncRunner); the ALTER below is only needed because ddl-auto=update does not
-- relax an existing NOT NULL constraint on a pre-existing column. Run once per tenant schema.

ALTER TABLE employee_offboardings ALTER COLUMN task_id DROP NOT NULL;
