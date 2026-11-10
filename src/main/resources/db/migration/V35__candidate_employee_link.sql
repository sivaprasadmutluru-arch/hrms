-- Retain explicit candidate-to-employee links in public and all existing tenant schemas.
DO $$
DECLARE workspace RECORD;
BEGIN
 FOR workspace IN SELECT table_schema FROM information_schema.tables WHERE table_name='candidates' AND table_schema NOT IN ('pg_catalog','information_schema') LOOP
  EXECUTE format('ALTER TABLE %I.candidates ADD COLUMN IF NOT EXISTS employee_id BIGINT',workspace.table_schema);
 END LOOP;
END $$;
