CREATE TABLE IF NOT EXISTS public.platform_operator_configuration (
 id INT PRIMARY KEY CHECK(id=1),organization_id BIGINT NOT NULL UNIQUE REFERENCES public.organizations(id),configured_by VARCHAR(255) NOT NULL,configured_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_check;
ALTER TABLE public.roles ADD CONSTRAINT roles_name_check CHECK(name IN ('SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_ADMIN','CEO','COMPANY_MANAGER','DEPARTMENT_MANAGER','HR_MANAGER','ACCOUNTS_MANAGER','EMPLOYEE','PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','TEAM_LEAD','PLATFORM_ORGANIZATION_OPERATIONS','PLATFORM_SUPPORT','PLATFORM_BILLING'));
INSERT INTO public.roles(name,display_name,description,is_active,created_at,updated_at) VALUES
 ('PLATFORM_ORGANIZATION_OPERATIONS','Organization Operations','AccrueHR customer onboarding and organization contact management; no platform role grants, billing or customer workforce access',true,NOW(),NOW()),
 ('PLATFORM_SUPPORT','Platform Support','AccrueHR organization-to-platform support only; no customer workforce or subscription management',true,NOW(),NOW()),
 ('PLATFORM_BILLING','Platform Billing','AccrueHR subscription and invoice operations; no customer payroll or internal helpdesk access',true,NOW(),NOW())
ON CONFLICT(name) DO NOTHING;
