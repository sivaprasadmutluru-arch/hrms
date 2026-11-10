BEGIN;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS industry_type VARCHAR(40);
-- Existing workspaces already have the software catalog; keep their current selection.
UPDATE public.organizations SET industry_type='SOFTWARE' WHERE industry_type IS NULL;
ALTER TABLE public.organizations ALTER COLUMN industry_type SET DEFAULT 'GENERAL';
ALTER TABLE public.organizations ALTER COLUMN industry_type SET NOT NULL;
CREATE TABLE IF NOT EXISTS public.company_setup_templates (
 company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 catalog_group VARCHAR(40) NOT NULL,initialized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(company_id,catalog_group)
);
CREATE TABLE IF NOT EXISTS public.company_setup_items (
 company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 item_type VARCHAR(20) NOT NULL CHECK(item_type IN ('DEPARTMENT','POSITION')),
 item_id BIGINT NOT NULL,catalog_group VARCHAR(40) NOT NULL,original_name VARCHAR(255) NOT NULL,
 original_department_id BIGINT,PRIMARY KEY(company_id,item_type,item_id)
);
COMMIT;
