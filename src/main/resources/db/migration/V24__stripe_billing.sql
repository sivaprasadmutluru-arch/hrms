-- Run once against the public schema before deploying with DDL_AUTO=validate.
-- Existing organizations keep legacy access; no payment or paid date is fabricated.
BEGIN;
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
 organization_id BIGINT PRIMARY KEY REFERENCES public.organizations(id) ON DELETE RESTRICT,
 version BIGINT NOT NULL DEFAULT 0, plan VARCHAR(255), cycle VARCHAR(255), status VARCHAR(255) NOT NULL DEFAULT 'LEGACY',
 legacy_access BOOLEAN NOT NULL DEFAULT TRUE,
 stripe_customer_id VARCHAR(255) UNIQUE, stripe_subscription_id VARCHAR(255) UNIQUE,
 stripe_price_id VARCHAR(255), checkout_session_id VARCHAR(255), checkout_url VARCHAR(255),
 checkout_expires_at TIMESTAMPTZ, checkout_generation BIGINT NOT NULL DEFAULT 0, checkout_price_id VARCHAR(255),
 started_at TIMESTAMPTZ, period_start TIMESTAMPTZ, period_end TIMESTAMPTZ, paid_until TIMESTAMPTZ,
 canceled_at TIMESTAMPTZ, ended_at TIMESTAMPTZ, cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
 amount_minor BIGINT, currency VARCHAR(255) DEFAULT 'inr', synced_at TIMESTAMPTZ, sync_error VARCHAR(255),
 live_mode BOOLEAN NOT NULL DEFAULT FALSE,
 CONSTRAINT billing_cycle_check CHECK (cycle IS NULL OR cycle IN ('MONTHLY','YEARLY')),
 CONSTRAINT billing_amount_check CHECK (amount_minor IS NULL OR amount_minor >= 0),
 CONSTRAINT billing_dates_check CHECK (period_start IS NULL OR period_end IS NULL OR period_end>period_start)
);
-- Checkout URLs can exceed 255 characters; no redirect URL is exposed in read APIs.
ALTER TABLE public.billing_subscriptions ALTER COLUMN checkout_url TYPE VARCHAR(2048);
CREATE TABLE IF NOT EXISTS public.billing_invoices (
 id VARCHAR(255) PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 subscription_id VARCHAR(255), number VARCHAR(255), status VARCHAR(255), amount_due BIGINT NOT NULL DEFAULT 0,
 amount_paid BIGINT NOT NULL DEFAULT 0, currency VARCHAR(255), created_at TIMESTAMPTZ, paid_at TIMESTAMPTZ,
 period_start TIMESTAMPTZ, period_end TIMESTAMPTZ, hosted_invoice_url VARCHAR(2048), invoice_pdf VARCHAR(2048)
);
CREATE INDEX IF NOT EXISTS billing_invoice_org_idx ON public.billing_invoices(organization_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.billing_events (
 id VARCHAR(255) PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 type VARCHAR(255), payload_hash VARCHAR(255), processed_at TIMESTAMPTZ
);
INSERT INTO public.billing_subscriptions(organization_id,plan,status,legacy_access)
 SELECT id,subscription_plan,'LEGACY',TRUE FROM public.organizations ON CONFLICT(organization_id) DO NOTHING;
COMMIT;
