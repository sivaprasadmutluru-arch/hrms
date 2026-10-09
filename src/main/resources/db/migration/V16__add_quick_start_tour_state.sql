ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS quick_start_tour_completed BOOLEAN NOT NULL DEFAULT FALSE;
