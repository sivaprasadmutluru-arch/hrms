ALTER TABLE public.users ADD COLUMN IF NOT EXISTS login_held boolean NOT NULL DEFAULT false;
