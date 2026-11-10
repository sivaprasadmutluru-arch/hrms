-- Preserve existing legacy/flat/manual subscriptions until their next explicit activation.
BEGIN;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS purchased_seats INTEGER;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_purchased_seats_check CHECK(purchased_seats IS NULL OR purchased_seats BETWEEN 1 AND 1000000);
ALTER TABLE public.billing_subscriptions ADD COLUMN IF NOT EXISTS seat_count INTEGER;
ALTER TABLE public.billing_subscriptions ADD COLUMN IF NOT EXISTS checkout_seats INTEGER;
ALTER TABLE public.billing_subscriptions ADD CONSTRAINT billing_seat_count_check CHECK(seat_count IS NULL OR seat_count BETWEEN 1 AND 1000000);
COMMIT;
