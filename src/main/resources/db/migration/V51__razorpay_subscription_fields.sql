-- Keep historical provider fields and invoices intact during the payment-provider switch.
ALTER TABLE public.billing_subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255);
ALTER TABLE public.billing_subscriptions ADD COLUMN IF NOT EXISTS razorpay_plan_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS billing_razorpay_subscription_uq ON public.billing_subscriptions(razorpay_subscription_id) WHERE razorpay_subscription_id IS NOT NULL;
