-- Work durations can exceed the original HH:MM varchar(5) representation for legacy data.
-- Apply to public and every existing tenant schema; Hibernate also creates new schemas at length 16.
DO $$
DECLARE
    schema_row RECORD;
BEGIN
    FOR schema_row IN
        SELECT DISTINCT table_schema
        FROM information_schema.tables
        WHERE table_name = 'work_records'
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.work_records ALTER COLUMN at_work TYPE varchar(16), ALTER COLUMN min_hour TYPE varchar(16)',
            schema_row.table_schema
        );
    END LOOP;
END $$;
