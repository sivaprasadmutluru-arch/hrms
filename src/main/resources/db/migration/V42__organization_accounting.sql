CREATE TABLE IF NOT EXISTS public.accounting_accounts (
 organization_id BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 code VARCHAR(40) NOT NULL,name VARCHAR(120) NOT NULL,type VARCHAR(16) NOT NULL CHECK(type IN ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE')),
 PRIMARY KEY(organization_id,code)
);
CREATE TABLE IF NOT EXISTS public.accounting_deduction_categories (
 company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,deduction_id BIGINT NOT NULL,
 category VARCHAR(16) NOT NULL CHECK(category IN ('PF','TDS','LOAN','OTHER')),updated_by VARCHAR(255),updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(company_id,deduction_id)
);
CREATE TABLE IF NOT EXISTS public.accounting_entries (
 id BIGSERIAL PRIMARY KEY,organization_id BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,entry_date DATE NOT NULL,
 type VARCHAR(32) NOT NULL,description VARCHAR(500) NOT NULL,reference VARCHAR(160),currency VARCHAR(10) NOT NULL,
 request_key VARCHAR(80) NOT NULL,request_hash VARCHAR(64) NOT NULL,source_key VARCHAR(100),source_hash VARCHAR(64),
 payslip_id BIGINT,reversal_of BIGINT REFERENCES public.accounting_entries(id),reversed_by BIGINT REFERENCES public.accounting_entries(id),
 created_by VARCHAR(255) NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(company_id,request_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS accounting_active_source ON public.accounting_entries(company_id,source_key) WHERE source_key IS NOT NULL AND reversed_by IS NULL AND reversal_of IS NULL;
CREATE TABLE IF NOT EXISTS public.accounting_lines (
 id BIGSERIAL PRIMARY KEY,entry_id BIGINT NOT NULL REFERENCES public.accounting_entries(id) ON DELETE CASCADE,
 account_code VARCHAR(40) NOT NULL,debit NUMERIC(16,2) NOT NULL DEFAULT 0,credit NUMERIC(16,2) NOT NULL DEFAULT 0,
 CHECK((debit>0 AND credit=0) OR (credit>0 AND debit=0))
);
CREATE INDEX IF NOT EXISTS accounting_company_date ON public.accounting_entries(company_id,entry_date,id);
CREATE INDEX IF NOT EXISTS accounting_lines_entry ON public.accounting_lines(entry_id);
CREATE TABLE IF NOT EXISTS public.accounting_payroll_reviews (
 company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,payslip_id BIGINT NOT NULL,source_hash VARCHAR(64) NOT NULL,
 pf NUMERIC(16,2) NOT NULL,tds NUMERIC(16,2) NOT NULL,employer_pf NUMERIC(16,2) NOT NULL,employer_other NUMERIC(16,2) NOT NULL,
 loan_recovery NUMERIC(16,2) NOT NULL,loss_of_pay NUMERIC(16,2) NOT NULL,attendance_deduction NUMERIC(16,2) NOT NULL,
 reason VARCHAR(500) NOT NULL,reviewed_by VARCHAR(255) NOT NULL,reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(company_id,payslip_id)
);
