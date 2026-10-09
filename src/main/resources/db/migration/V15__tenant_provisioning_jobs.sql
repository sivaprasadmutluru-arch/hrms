-- Durable account/workspace provisioning state.  Production runs Hibernate in
-- validate mode, therefore this table is created explicitly as part of deploy.
CREATE TABLE IF NOT EXISTS public.tenant_provisioning_jobs (
    id BIGSERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    company_id BIGINT NOT NULL UNIQUE REFERENCES public.companies(id),
    initial_admin_user_id BIGINT REFERENCES public.users(id),
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error VARCHAR(4000),
    lease_expires_at TIMESTAMP,
    next_attempt_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_provisioning_jobs_status
    ON public.tenant_provisioning_jobs(status, next_attempt_at);

-- Recover any tenants stranded by the previous synchronous setup path.  They
-- receive exactly the same idempotent worker flow as a newly-created tenant;
-- this is intentionally not a one-off production data repair.
INSERT INTO public.tenant_provisioning_jobs (
    is_active, created_at, updated_at, company_id, initial_admin_user_id,
    status, attempts, next_attempt_at
)
SELECT
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    c.id,
    (
        SELECT ur.user_id
        FROM public.user_roles ur
        WHERE ur.company_id = c.id
          AND ur.is_active = TRUE
        ORDER BY ur.id
        LIMIT 1
    ),
    'PENDING',
    0,
    CURRENT_TIMESTAMP
FROM public.companies c
WHERE c.company_type = 'HEAD_OFFICE'
  AND c.is_active = TRUE
  AND c.schema_ready = FALSE
ON CONFLICT (company_id) DO NOTHING;
