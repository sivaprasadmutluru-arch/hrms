-- Run once per installation. Existing KPI tables gain metadata; no new tables.
DO $$
DECLARE s record;
BEGIN
  FOR s IN SELECT table_schema FROM information_schema.tables WHERE table_name='carr_kpis' AND table_schema NOT IN ('pg_catalog','information_schema') LOOP
    EXECUTE format('ALTER TABLE %I.carr_kpis ADD COLUMN IF NOT EXISTS metric_definition varchar(1000), ADD COLUMN IF NOT EXISTS generation_key varchar(100), ADD COLUMN IF NOT EXISTS manually_edited boolean DEFAULT false',s.table_schema);
    EXECUTE format('ALTER TABLE %I.carr_kpis ALTER COLUMN actual_value DROP NOT NULL, ALTER COLUMN actual_value DROP DEFAULT',s.table_schema);
    -- Legacy default zero without evidence does not establish a measured observation.
    EXECUTE format('UPDATE %I.carr_kpis SET actual_value=NULL WHERE actual_value=0 AND (evidence IS NULL OR btrim(evidence)='''')',s.table_schema);
  END LOOP;
END $$;
