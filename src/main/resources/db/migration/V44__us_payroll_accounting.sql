ALTER TABLE public.accounting_deduction_categories ALTER COLUMN category TYPE VARCHAR(32);
ALTER TABLE public.accounting_deduction_categories DROP CONSTRAINT IF EXISTS accounting_deduction_categories_category_check;
ALTER TABLE public.accounting_deduction_categories ADD CONSTRAINT accounting_deduction_categories_category_check CHECK (category IN ('PF','TDS','PENSION','LOAN','OTHER','US_FEDERAL','US_STATE','US_LOCAL','US_SOCIAL_SECURITY','US_MEDICARE'));
ALTER TABLE public.accounting_payroll_reviews ADD COLUMN IF NOT EXISTS us_taxes TEXT NOT NULL DEFAULT '{}';
