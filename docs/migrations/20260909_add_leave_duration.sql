-- Adds half-day leave support to every existing tenant schema.
-- Safe to run more than once. Existing requests remain full-day requests.
DO $$
DECLARE
    tenant_schema text;
BEGIN
    FOR tenant_schema IN
        SELECT DISTINCT schema_name
        FROM public.companies
        WHERE schema_name IS NOT NULL
          AND schema_name <> ''
    LOOP
        IF to_regclass(format('%I.leave_requests', tenant_schema)) IS NOT NULL THEN
            EXECUTE format(
                'ALTER TABLE %I.leave_requests ADD COLUMN IF NOT EXISTS leave_duration varchar(20)',
                tenant_schema
            );
            EXECUTE format(
                'UPDATE %I.leave_requests SET leave_duration = ''FULL_DAY'' WHERE leave_duration IS NULL',
                tenant_schema
            );
            EXECUTE format(
                'ALTER TABLE %I.leave_requests ALTER COLUMN leave_duration SET DEFAULT ''FULL_DAY''',
                tenant_schema
            );
        END IF;
    END LOOP;
END $$;
