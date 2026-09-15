-- Read-only legacy assignment migration report. This never changes data.
WITH proposed AS (
SELECT ur.id AS assignment_id, ur.user_id, ur.company_id, ur.access_scope,
       r.id AS current_role_id, r.name AS current_role,
       CASE
         WHEN r.name='PLATFORM_SUPER_ADMIN' THEN 'SUPER_ADMIN'
         WHEN r.name='ENTERPRISE_ADMIN' AND ur.access_scope IN ('ENTERPRISE','HEAD_OFFICE') THEN 'COMPANY_ADMIN'
         WHEN r.name='ACCOUNTANT' THEN 'ACCOUNTS_MANAGER'
         WHEN r.name='TEAM_LEAD' THEN 'DEPARTMENT_MANAGER'
         WHEN r.name IN ('HR_MANAGER','DEPARTMENT_MANAGER','EMPLOYEE') THEN r.name
         ELSE NULL
       END AS proposed_role
FROM public.user_roles ur
JOIN public.roles r ON r.id=ur.role_id
), report AS (
SELECT p.*, u.username, c.name AS company, pr.id AS proposed_role_id,
       CASE
         WHEN p.current_role='BRANCH_ADMIN' THEN 'REVIEW_REQUIRED_RETAIN_BRANCH_RESTRICTION'
         WHEN p.current_role='ENTERPRISE_ADMIN' AND p.access_scope NOT IN ('ENTERPRISE','HEAD_OFFICE') THEN 'REVIEW_REQUIRED_SCOPE_MISMATCH'
         WHEN p.proposed_role IS NULL THEN 'REVIEW_REQUIRED_RETAIN_RESTRICTED'
         ELSE 'SAFE_COMPATIBLE_MAPPING'
       END AS resolution
FROM proposed p
JOIN public.users u ON u.id=p.user_id
LEFT JOIN public.companies c ON c.id=p.company_id
LEFT JOIN public.roles pr ON pr.name=p.proposed_role
)
SELECT report.assignment_id, report.username, report.company, report.current_role,
       report.access_scope, report.proposed_role, report.resolution,
       COALESCE((SELECT array_agg(pe.name ORDER BY pe.name)
                 FROM public.role_permissions rp JOIN public.permissions pe ON pe.id=rp.permission_id
                 WHERE rp.role_id=report.current_role_id), ARRAY[]::varchar[]) AS current_permissions,
       COALESCE((SELECT array_agg(pe.name ORDER BY pe.name)
                 FROM public.role_permissions rp JOIN public.permissions pe ON pe.id=rp.permission_id
                 WHERE rp.role_id=report.proposed_role_id), ARRAY[]::varchar[]) AS proposed_permissions,
       COALESCE((SELECT array_agg(pe.name ORDER BY pe.name)
                 FROM public.role_permissions rp JOIN public.permissions pe ON pe.id=rp.permission_id
                 WHERE rp.role_id=report.proposed_role_id AND NOT EXISTS
                   (SELECT 1 FROM public.role_permissions oldrp
                    WHERE oldrp.role_id=report.current_role_id AND oldrp.permission_id=rp.permission_id)),
                ARRAY[]::varchar[]) AS permissions_that_would_be_added
FROM report
ORDER BY username, company, current_role;
