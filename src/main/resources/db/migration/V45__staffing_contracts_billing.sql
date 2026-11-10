CREATE TABLE IF NOT EXISTS public.staffing_worker_profiles (
 company_id BIGINT NOT NULL REFERENCES public.companies(id),employee_id BIGINT NOT NULL,
 classification VARCHAR(24) NOT NULL CHECK(classification IN ('EMPLOYEE','INDEPENDENT_CONTRACTOR','VENDOR_WORKER')),
 employment_term VARCHAR(16) NOT NULL CHECK(employment_term IN ('PERMANENT','FIXED_TERM')),
 pay_basis VARCHAR(12) NOT NULL CHECK(pay_basis IN ('HOURLY','SALARIED')),
 vendor_name VARCHAR(160),notes VARCHAR(1000),version INT NOT NULL DEFAULT 1,updated_by VARCHAR(255) NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(company_id,employee_id)
);
CREATE TABLE IF NOT EXISTS public.staffing_authorizations (
 id BIGSERIAL PRIMARY KEY,company_id BIGINT NOT NULL REFERENCES public.companies(id),employee_id BIGINT NOT NULL,
 category VARCHAR(32) NOT NULL,sponsor VARCHAR(200),reference VARCHAR(160),valid_from DATE NOT NULL,valid_until DATE,
 document_id BIGINT,notes VARCHAR(1000),version INT NOT NULL DEFAULT 1,created_by VARCHAR(255) NOT NULL,updated_by VARCHAR(255) NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS staffing_authorization_expiry ON public.staffing_authorizations(company_id,valid_until);
CREATE TABLE IF NOT EXISTS public.staffing_clients (
 id BIGSERIAL PRIMARY KEY,company_id BIGINT NOT NULL REFERENCES public.companies(id),name VARCHAR(160) NOT NULL,email VARCHAR(200),address VARCHAR(1000),active BOOLEAN NOT NULL DEFAULT TRUE,
 version INT NOT NULL DEFAULT 1,created_by VARCHAR(255) NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(company_id,name)
);
CREATE TABLE IF NOT EXISTS public.staffing_assignments (
 id BIGSERIAL PRIMARY KEY,company_id BIGINT NOT NULL REFERENCES public.companies(id),employee_id BIGINT NOT NULL,client_id BIGINT NOT NULL REFERENCES public.staffing_clients(id),
 title VARCHAR(200) NOT NULL,contract_reference VARCHAR(160),work_location VARCHAR(300) NOT NULL,work_state VARCHAR(100),work_country VARCHAR(100) NOT NULL,
 starts_on DATE NOT NULL,ends_on DATE,payroll_contract_id BIGINT,
 pay_rate NUMERIC(14,4) NOT NULL CHECK(pay_rate>=0),bill_rate NUMERIC(14,4) NOT NULL CHECK(bill_rate>=0),overtime_pay_rate NUMERIC(14,4) NOT NULL CHECK(overtime_pay_rate>=0),overtime_bill_rate NUMERIC(14,4) NOT NULL CHECK(overtime_bill_rate>=0),
 currency VARCHAR(10) NOT NULL,status VARCHAR(12) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','ENDED')),version INT NOT NULL DEFAULT 1,created_by VARCHAR(255) NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(ends_on IS NULL OR ends_on>=starts_on)
);
CREATE TABLE IF NOT EXISTS public.staffing_time_entries (
 id BIGSERIAL PRIMARY KEY,company_id BIGINT NOT NULL REFERENCES public.companies(id),assignment_id BIGINT NOT NULL REFERENCES public.staffing_assignments(id),
 employee_id BIGINT NOT NULL,work_date DATE NOT NULL,regular_hours NUMERIC(5,2) NOT NULL CHECK(regular_hours>=0),overtime_hours NUMERIC(5,2) NOT NULL CHECK(overtime_hours>=0),
 description VARCHAR(1000),source_timesheet_id BIGINT,source_hash VARCHAR(64),
 pay_rate NUMERIC(14,4) NOT NULL,bill_rate NUMERIC(14,4) NOT NULL,overtime_pay_rate NUMERIC(14,4) NOT NULL,overtime_bill_rate NUMERIC(14,4) NOT NULL,
 currency VARCHAR(10) NOT NULL,status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED')),
 review_reason VARCHAR(500),submitted_by VARCHAR(255),approved_by VARCHAR(255),version INT NOT NULL DEFAULT 1,created_by VARCHAR(255) NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(regular_hours+overtime_hours>0 AND regular_hours+overtime_hours<=24),UNIQUE(assignment_id,work_date),UNIQUE(company_id,source_timesheet_id)
);
CREATE INDEX IF NOT EXISTS staffing_time_period ON public.staffing_time_entries(company_id,work_date,status);
CREATE TABLE IF NOT EXISTS public.staffing_invoices (
 id BIGSERIAL PRIMARY KEY,company_id BIGINT NOT NULL REFERENCES public.companies(id),client_id BIGINT NOT NULL REFERENCES public.staffing_clients(id),
 invoice_date DATE NOT NULL,due_date DATE NOT NULL,currency VARCHAR(10) NOT NULL,subtotal NUMERIC(16,2) NOT NULL,tax_percent NUMERIC(6,3) NOT NULL,tax_amount NUMERIC(16,2) NOT NULL,total NUMERIC(16,2) NOT NULL,
 status VARCHAR(12) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ISSUED','VOID')),journal_id BIGINT REFERENCES public.accounting_entries(id),
 client_snapshot TEXT NOT NULL,request_key VARCHAR(80) NOT NULL,request_hash VARCHAR(64) NOT NULL,created_by VARCHAR(255) NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 void_reason VARCHAR(500),voided_by VARCHAR(255),UNIQUE(company_id,request_key),CHECK(due_date>=invoice_date)
);
CREATE TABLE IF NOT EXISTS public.staffing_invoice_lines (
 id BIGSERIAL PRIMARY KEY,invoice_id BIGINT NOT NULL REFERENCES public.staffing_invoices(id),time_entry_id BIGINT NOT NULL REFERENCES public.staffing_time_entries(id),description VARCHAR(1000) NOT NULL,
 regular_hours NUMERIC(5,2) NOT NULL,overtime_hours NUMERIC(5,2) NOT NULL,bill_rate NUMERIC(14,4) NOT NULL,overtime_bill_rate NUMERIC(14,4) NOT NULL,amount NUMERIC(16,2) NOT NULL,released BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS staffing_invoice_time_once ON public.staffing_invoice_lines(time_entry_id) WHERE released=FALSE;
CREATE TABLE IF NOT EXISTS public.staffing_receipts (
 id BIGSERIAL PRIMARY KEY,invoice_id BIGINT NOT NULL REFERENCES public.staffing_invoices(id),company_id BIGINT NOT NULL REFERENCES public.companies(id),
 payment_date DATE NOT NULL,amount NUMERIC(16,2) NOT NULL CHECK(amount>0),account VARCHAR(10) NOT NULL CHECK(account IN ('BANK','CASH')),reference VARCHAR(160) NOT NULL,
 request_key VARCHAR(80) NOT NULL,request_hash VARCHAR(64) NOT NULL,journal_id BIGINT NOT NULL REFERENCES public.accounting_entries(id),created_by VARCHAR(255) NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(company_id,request_key)
);
