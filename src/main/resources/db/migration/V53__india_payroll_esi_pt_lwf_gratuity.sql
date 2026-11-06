-- V53: India payroll — add ESI, Professional Tax (PT), Labour Welfare Fund (LWF), Gratuity categories
-- These extend the existing PF + TDS India accounting profile.

-- 1. Extend the deduction category CHECK constraint to allow new India-specific categories
ALTER TABLE public.accounting_deduction_categories
    DROP CONSTRAINT IF EXISTS accounting_deduction_categories_category_check;

ALTER TABLE public.accounting_deduction_categories
    ADD CONSTRAINT accounting_deduction_categories_category_check
        CHECK (category IN (
            'PF', 'TDS', 'PENSION', 'LOAN', 'OTHER',
            'IN_ESI', 'IN_PT', 'IN_LWF',
            'US_FEDERAL', 'US_STATE', 'US_LOCAL', 'US_SOCIAL_SECURITY', 'US_MEDICARE',
            'UK_PAYE', 'UK_NATIONAL_INSURANCE', 'UK_STUDENT_LOAN',
            'UK_POSTGRADUATE_LOAN', 'UK_APPRENTICESHIP_LEVY'
        ));

-- 2. Add ESI, PT, LWF columns to payroll reviews table (employee share)
ALTER TABLE public.accounting_payroll_reviews
    ADD COLUMN IF NOT EXISTS esi            NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (esi >= 0),
    ADD COLUMN IF NOT EXISTS employer_esi   NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (employer_esi >= 0),
    ADD COLUMN IF NOT EXISTS professional_tax NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (professional_tax >= 0),
    ADD COLUMN IF NOT EXISTS lwf            NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (lwf >= 0),
    ADD COLUMN IF NOT EXISTS employer_lwf   NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (employer_lwf >= 0),
    ADD COLUMN IF NOT EXISTS gratuity_provision NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (gratuity_provision >= 0);

-- 3. Add India chart-of-accounts codes to any organization already set up
-- (New orgs get these via ensureAccounts() in AccountingService)
INSERT INTO public.accounting_accounts (organization_id, code, name, type)
SELECT DISTINCT o.id,
                v.code,
                v.name,
                v.type
FROM   public.organizations o
       CROSS JOIN (VALUES
           ('ESI_PAYABLE',       'ESI Payable (employee + employer)',   'LIABILITY'),
           ('EMPLOYER_ESI',      'Employer ESI Contribution',           'EXPENSE'),
           ('PT_PAYABLE',        'Professional Tax Payable',            'LIABILITY'),
           ('LWF_PAYABLE',       'Labour Welfare Fund Payable',         'LIABILITY'),
           ('EMPLOYER_LWF',      'Employer LWF Contribution',           'EXPENSE'),
           ('GRATUITY_EXPENSE',  'Gratuity Provision (monthly)',        'EXPENSE'),
           ('GRATUITY_PAYABLE',  'Gratuity Provision Payable',          'LIABILITY')
       ) AS v(code, name, type)
ON CONFLICT (organization_id, code) DO NOTHING;
