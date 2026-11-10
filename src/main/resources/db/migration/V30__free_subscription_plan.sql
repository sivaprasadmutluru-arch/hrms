-- Add the Free tier without changing any existing organization's selected plan.
BEGIN;
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_subscription_plan_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_subscription_plan_check
 CHECK (subscription_plan IN ('FREE','BASIC','STANDARD','ENTERPRISE'));
COMMIT;
