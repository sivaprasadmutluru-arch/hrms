-- An unmeasured actual is NULL, not a fabricated zero. Preserve all existing observations.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT table_schema FROM information_schema.tables
           WHERE table_name = 'carr_kpis' AND table_type = 'BASE TABLE'
             AND table_schema NOT IN ('pg_catalog', 'information_schema')
  LOOP
    EXECUTE format('ALTER TABLE %I.carr_kpis ALTER COLUMN actual_value DROP NOT NULL, ALTER COLUMN actual_value DROP DEFAULT', t.table_schema);
  END LOOP;
END $$;
