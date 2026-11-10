-- Rename the Accrue Technologies platform contact and linked admin identity.
-- Run against an existing AccrueHRMS database after confirming the new address
-- does not belong to another user. Keeps IDs, passwords, roles, and history.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE lower(email) = 'hr@accruetechnologies.com'
       OR lower(username) = 'hr@accruetechnologies.com'
  ) THEN
    RAISE EXCEPTION 'The replacement address is already assigned to a user';
  END IF;
END $$;

UPDATE public.users
SET email = 'hr@accruetechnologies.com',
    username = CASE WHEN lower(username) = 'siva@accruetechnologies.com'
                    THEN 'hr@accruetechnologies.com' ELSE username END
WHERE lower(email) = 'siva@accruetechnologies.com'
   OR lower(username) = 'siva@accruetechnologies.com';

UPDATE public.organizations
SET contact_email = 'hr@accruetechnologies.com'
WHERE lower(contact_email) = 'siva@accruetechnologies.com';

UPDATE public.companies
SET email = 'hr@accruetechnologies.com'
WHERE lower(email) = 'siva@accruetechnologies.com';

UPDATE accrue_technologies.employees
SET email = 'hr@accruetechnologies.com'
WHERE lower(email) = 'siva@accruetechnologies.com';

COMMIT;
