-- Additive, repeatable migration for canonical roles and scoped assignments.
-- Run the companion dry-run query before applying role conversions. This script
-- does not convert or delete any existing assignment.
BEGIN;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS account_manager_company_limit integer NOT NULL DEFAULT 6;

ALTER TABLE public.user_roles
    ADD COLUMN IF NOT EXISTS department_id bigint,
    ADD COLUMN IF NOT EXISTS team_id bigint,
    ADD COLUMN IF NOT EXISTS employee_scope_id bigint,
    ADD COLUMN IF NOT EXISTS effective_from date NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS expires_on date,
    ADD COLUMN IF NOT EXISTS assignment_status varchar(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS granted_by_user_id bigint,
    ADD COLUMN IF NOT EXISTS assignment_reason varchar(500);

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS ck_user_roles_dates;
ALTER TABLE public.user_roles ADD CONSTRAINT ck_user_roles_dates
    CHECK (expires_on IS NULL OR expires_on >= effective_from);

-- PostgreSQL/Hibernate enum check constraints do not expand automatically when
-- Java enum values are added. Replace the legacy constraint before inserting
-- canonical roles. Existing legacy identifiers remain valid.
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_check;
ALTER TABLE public.roles ADD CONSTRAINT roles_name_check CHECK (name IN (
 'SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_ADMIN','COMPANY_MANAGER',
 'DEPARTMENT_MANAGER','HR_MANAGER','ACCOUNTS_MANAGER','EMPLOYEE',
 'PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','TEAM_LEAD'
));

INSERT INTO public.roles (name, display_name, description, is_active, created_at, updated_at)
VALUES
 ('SUPER_ADMIN', 'Super Admin', 'Platform administration; customer support access must be explicitly authorized and audited', true, now(), now()),
 ('ACCOUNT_MANAGER', 'Account Manager', 'Standing access to explicitly assigned companies and all their current and future branches', true, now(), now()),
 ('COMPANY_ADMIN', 'Company Admin', 'Company administration within delegated permissions', true, now(), now()),
 ('COMPANY_MANAGER', 'Company Manager', 'Company operations and explicitly designated approvals', true, now(), now()),
 ('ACCOUNTS_MANAGER', 'Accounts Manager', 'Payroll and employee finance within assigned scope', true, now(), now())
ON CONFLICT (name) DO UPDATE SET
 display_name=EXCLUDED.display_name, description=EXCLUDED.description, updated_at=now(), is_active=true;

-- Permission-compatible canonical replacements. No user assignments are changed.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT target.id, rp.permission_id
FROM public.roles target
JOIN public.roles legacy ON legacy.name = 'PLATFORM_SUPER_ADMIN'
JOIN public.role_permissions rp ON rp.role_id = legacy.id
WHERE target.name = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT target.id, rp.permission_id
FROM public.roles target
JOIN public.roles legacy ON legacy.name = 'ENTERPRISE_ADMIN'
JOIN public.role_permissions rp ON rp.role_id = legacy.id
JOIN public.permissions p ON p.id = rp.permission_id
WHERE target.name IN ('ACCOUNT_MANAGER','COMPANY_ADMIN') AND p.module <> 'organization'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT target.id, rp.permission_id
FROM public.roles target
JOIN public.roles legacy ON legacy.name = 'ACCOUNTANT'
JOIN public.role_permissions rp ON rp.role_id = legacy.id
WHERE target.name = 'ACCOUNTS_MANAGER'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.name='COMPANY_MANAGER' AND p.name IN
 ('employee:view','attendance:view','attendance:approve','leave:view','leave:approve',
  'recruitment:view','recruitment:create','pms:view','pms:create','report:view','report:export')
ON CONFLICT DO NOTHING;

COMMIT;
