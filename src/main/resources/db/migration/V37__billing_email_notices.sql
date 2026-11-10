CREATE TABLE IF NOT EXISTS public.billing_notices (
 id VARCHAR(255) PRIMARY KEY,
 organization_id BIGINT NOT NULL,
 kind VARCHAR(255) NOT NULL,
 period_end TIMESTAMP WITH TIME ZONE NOT NULL,
 recipient VARCHAR(255),
 status VARCHAR(255) NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 created_at TIMESTAMP WITH TIME ZONE NOT NULL,
 sent_at TIMESTAMP WITH TIME ZONE,
 next_attempt_at TIMESTAMP WITH TIME ZONE,
 last_error VARCHAR(255),
 CONSTRAINT billing_notice_period_unique UNIQUE(organization_id,kind,period_end)
);
CREATE INDEX IF NOT EXISTS billing_notice_org_idx ON public.billing_notices(organization_id,created_at);
