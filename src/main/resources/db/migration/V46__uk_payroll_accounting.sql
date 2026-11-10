ALTER TABLE public.accounting_deduction_categories DROP CONSTRAINT IF EXISTS accounting_deduction_categories_category_check;
ALTER TABLE public.accounting_deduction_categories ADD CONSTRAINT accounting_deduction_categories_category_check CHECK (category IN ('PF','TDS','PENSION','LOAN','OTHER','US_FEDERAL','US_STATE','US_LOCAL','US_SOCIAL_SECURITY','US_MEDICARE','UK_PAYE','UK_NATIONAL_INSURANCE','UK_STUDENT_LOAN','UK_POSTGRADUATE_LOAN','UK_APPRENTICESHIP_LEVY'));
ALTER TABLE public.accounting_payroll_reviews ADD COLUMN IF NOT EXISTS uk_taxes TEXT NOT NULL DEFAULT '{}';
