CREATE TABLE IF NOT EXISTS public.holiday_catalog_imports (
 company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 country VARCHAR(16) NOT NULL, calendar_year INTEGER NOT NULL, catalog_key VARCHAR(80) NOT NULL,
 holiday_id BIGINT NOT NULL, source_url TEXT NOT NULL, dates_confirmed BOOLEAN NOT NULL DEFAULT false,
 imported_by VARCHAR(255), imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(company_id,country,calendar_year,catalog_key)
);
