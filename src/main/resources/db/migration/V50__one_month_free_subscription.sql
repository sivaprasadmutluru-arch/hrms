-- Existing Free organizations receive one final calendar month from migration.
-- Preserve their original activation timestamp and billing event history.
UPDATE public.billing_subscriptions
SET started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
    period_start = CURRENT_TIMESTAMP,
    period_end = CURRENT_TIMESTAMP + INTERVAL '1 month',
    paid_until = CURRENT_TIMESTAMP + INTERVAL '1 month',
    version = version + 1
WHERE plan = 'FREE' AND status = 'free_active' AND legacy_access = FALSE
  AND (period_end IS NULL OR paid_until IS NULL);
