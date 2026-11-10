BEGIN;
ALTER TABLE public.billing_subscriptions ADD COLUMN IF NOT EXISTS manual_access BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.billing_events ADD COLUMN IF NOT EXISTS actor VARCHAR(255);
ALTER TABLE public.billing_events ADD COLUMN IF NOT EXISTS details VARCHAR(2048);
CREATE INDEX IF NOT EXISTS billing_events_org_type_date_idx ON public.billing_events(organization_id,type,processed_at DESC);
COMMIT;
