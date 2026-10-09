-- Recoverable company deletion.  Archiving retains the tenant schema and all public
-- records, so restore does not require a database-level point-in-time recovery.
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS archived_at timestamp;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS archived_by varchar(255);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS archive_reason text;
