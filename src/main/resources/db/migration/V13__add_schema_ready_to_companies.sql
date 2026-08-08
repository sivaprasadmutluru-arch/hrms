-- Adds Company.schemaReady, used to reject employee create/import against a Head Office
-- whose tenant schema hasn't finished provisioning yet (see CompanyService#createHeadOffice
-- and EmployeeService#doCreate). public.companies is only auto-synced by Hibernate when
-- spring.jpa.hibernate.ddl-auto=update (local/dev default); prod runs with ddl-auto=validate
-- (see application-prod.properties), so this column must be added manually before/at deploy.
-- Default true so all existing, already-provisioned companies are unaffected.

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS schema_ready boolean NOT NULL DEFAULT true;
