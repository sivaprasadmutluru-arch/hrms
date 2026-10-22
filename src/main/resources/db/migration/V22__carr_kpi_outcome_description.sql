-- Add the outcome description to every existing tenant's KPI table.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT table_schema FROM information_schema.tables
           WHERE table_name = 'carr_kpis' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I.carr_kpis ADD COLUMN IF NOT EXISTS description varchar(1000)', t.table_schema);
  END LOOP;
END $$;
