BEGIN;
CREATE TABLE IF NOT EXISTS public.job_position_access (
 company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 job_position_id BIGINT NOT NULL,
 profile VARCHAR(32) NOT NULL CHECK(profile IN ('NONE','CEO','COO','EMPLOYEE')),
 version BIGINT NOT NULL DEFAULT 0,
 updated_by BIGINT REFERENCES public.users(id), updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(company_id,job_position_id)
);
CREATE TABLE IF NOT EXISTS public.job_position_access_audit (
 id BIGSERIAL PRIMARY KEY,company_id BIGINT NOT NULL,job_position_id BIGINT NOT NULL,
 position_name VARCHAR(255) NOT NULL,old_profile VARCHAR(32) NOT NULL,new_profile VARCHAR(32) NOT NULL,
 actor VARCHAR(255) NOT NULL,changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS job_position_access_audit_lookup ON public.job_position_access_audit(company_id,job_position_id,id DESC);
COMMIT;
