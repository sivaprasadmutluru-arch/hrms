-- Keep every tenant CARR status constraint aligned with CarrStatus.
-- Older tenant schemas omitted ACKNOWLEDGEMENT_PENDING, which prevented an
-- approved CARR from entering the employee acknowledgement step.
DO $$
DECLARE target record;
BEGIN
    FOR target IN
        SELECT table_schema
        FROM information_schema.tables
        WHERE table_name = 'carr_records'
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.carr_records DROP CONSTRAINT IF EXISTS carr_records_status_check',
            target.table_schema
        );
        EXECUTE format(
            'ALTER TABLE %I.carr_records ADD CONSTRAINT carr_records_status_check '
            || 'CHECK (status IN ('
            || '''DRAFT'',''SUBMITTED'',''MANAGER_REVIEW'',''DEPT_HEAD_REVIEW'','
            || '''HR_REVIEW'',''APPROVED'',''ACKNOWLEDGEMENT_PENDING'',''PUBLISHED'','
            || '''RETURNED'',''ARCHIVED''))',
            target.table_schema
        );
    END LOOP;
END $$;
