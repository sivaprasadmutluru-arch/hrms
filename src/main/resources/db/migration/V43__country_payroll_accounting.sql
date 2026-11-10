ALTER TABLE public.accounting_deduction_categories DROP CONSTRAINT IF EXISTS accounting_deduction_categories_category_check;
ALTER TABLE public.accounting_deduction_categories ADD CONSTRAINT accounting_deduction_categories_category_check CHECK (category IN ('PF','TDS','PENSION','LOAN','OTHER'));
ALTER TABLE public.accounting_payroll_reviews ADD COLUMN IF NOT EXISTS pension NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (pension >= 0);
ALTER TABLE public.accounting_payroll_reviews ADD COLUMN IF NOT EXISTS employer_pension NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (employer_pension >= 0);
