-- Safe rollback: retain additive columns and assignments to avoid data loss.
-- Canonical role templates are disabled only when they are not assigned.
UPDATE public.roles r SET is_active=false, updated_at=now()
WHERE r.name IN ('SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_ADMIN','COMPANY_MANAGER','ACCOUNTS_MANAGER')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.role_id=r.id AND ur.assignment_status='ACTIVE');
