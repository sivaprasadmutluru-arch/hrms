ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS brand_color varchar(7);

ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_brand_color_format;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_brand_color_format
    CHECK (brand_color IS NULL OR brand_color ~ '^#[0-9A-Fa-f]{6}$');
