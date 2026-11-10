-- Apply to public and every existing tenant before deploying public careers.
DO $$
DECLARE workspace RECORD;
BEGIN
 FOR workspace IN SELECT table_schema FROM information_schema.tables WHERE table_name='recruitment_posts' AND table_schema NOT IN ('pg_catalog','information_schema') LOOP
  EXECUTE format('ALTER TABLE %I.recruitment_posts ADD COLUMN IF NOT EXISTS department VARCHAR(255)',workspace.table_schema);
  EXECUTE format('ALTER TABLE %I.recruitment_posts ADD COLUMN IF NOT EXISTS location VARCHAR(255)',workspace.table_schema);
  EXECUTE format('ALTER TABLE %I.recruitment_posts ADD COLUMN IF NOT EXISTS employment_type VARCHAR(255) DEFAULT ''FULL_TIME''',workspace.table_schema);
 END LOOP;
END $$;
