-- Existing organizations retain an unknown size until an admin supplies it.
BEGIN;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS employee_range VARCHAR(255);
ALTER TABLE public.organizations ADD CONSTRAINT organizations_employee_range_check
 CHECK (employee_range IS NULL OR employee_range IN ('EMPLOYEES_1_20','EMPLOYEES_21_50','EMPLOYEES_51_200','EMPLOYEES_201_500','EMPLOYEES_501_1000','EMPLOYEES_1001_5000','EMPLOYEES_5001_PLUS'));
COMMIT;
