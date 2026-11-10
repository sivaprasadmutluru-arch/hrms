CREATE TABLE IF NOT EXISTS public.company_setup_defaults (
 company_id BIGINT PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
 catalog_version INTEGER NOT NULL,
 initialized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
