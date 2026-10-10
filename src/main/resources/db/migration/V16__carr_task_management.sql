-- Additive upgrade for public and existing tenant CARR tables.
-- Run before starting a production deployment with DDL_AUTO=validate.
-- New tenant schemas are provisioned from the entity definitions as usual.
DO $$
DECLARE target record;
BEGIN
    FOR target IN
        SELECT table_schema FROM information_schema.tables
        WHERE table_name = 'carr_responsibilities' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE %I.carr_responsibilities
            ADD COLUMN IF NOT EXISTS description text,
            ADD COLUMN IF NOT EXISTS due_date date,
            ADD COLUMN IF NOT EXISTS task_status varchar(30) NOT NULL DEFAULT ''TODO'',
            ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0', target.table_schema);
        EXECUTE format('ALTER TABLE %I.carr_records
            ADD COLUMN IF NOT EXISTS task_record boolean NOT NULL DEFAULT false', target.table_schema);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_carr_task_record
            ON %I.carr_responsibilities(carr_id)', target.table_schema);
    END LOOP;
END $$;
