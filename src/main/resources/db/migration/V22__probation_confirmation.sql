-- Apply BEFORE deploying the build under ddl-auto=validate.
-- New tenants are provisioned from entity metadata; all existing employee schemas need these tables.
-- Policies are opt-in: this migration does not confirm employees or change leave balances.
DO $$
DECLARE s record;
BEGIN
  FOR s IN SELECT schemaname AS table_schema, tableowner FROM pg_tables
           WHERE tablename='employees' AND schemaname NOT IN ('pg_catalog','information_schema') LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.probation_policies (
      id bigserial PRIMARY KEY, company_id bigint NOT NULL UNIQUE,
      enabled boolean NOT NULL DEFAULT false, effective_from date NOT NULL,
      is_active boolean DEFAULT true, created_at timestamp, updated_at timestamp)', s.table_schema);
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.probation_confirmations (
      id bigserial PRIMARY KEY, employee_id bigint NOT NULL UNIQUE, company_id bigint NOT NULL,
      confirmed_on date NOT NULL, processed_on date NOT NULL,
      is_active boolean DEFAULT true, created_at timestamp, updated_at timestamp)', s.table_schema);
    -- Match the existing application's ownership, including the tables' serial sequences.
    EXECUTE format('ALTER TABLE %I.probation_policies OWNER TO %I', s.table_schema, s.tableowner);
    EXECUTE format('ALTER TABLE %I.probation_confirmations OWNER TO %I', s.table_schema, s.tableowner);
  END LOOP;
END $$;
