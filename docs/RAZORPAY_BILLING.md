# Razorpay subscription billing

AccrueHR uses Razorpay-hosted subscription links for the three paid fixed packages. Free remains one month and requires no payment. Manual activation is an audited platform-billing bypass only when enabled. No payment credentials or card details belong in source control or the frontend.

## Setup

1. Back up production PostgreSQL and apply `V51__razorpay_subscription_fields.sql` to the public schema. Existing historical provider columns and invoice rows are retained. This repository does not run migrations automatically.
2. Create six INR Razorpay plans using the fixed package catalog amounts: Basic ₹1,000/month or ₹12,000/year; Standard ₹4,000/month or ₹48,000/year; Enterprise ₹9,000/month or ₹1,08,000/year. Each plan uses interval 1, quantity 1, and the corresponding monthly or yearly period. Configure their IDs in `.env.billing.example` variables in the backend process environment. Do not set actual credentials in this example file.
3. Enable Razorpay Subscriptions in the intended test and live accounts. Configure test keys first. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, six `RAZORPAY_PLAN_*` IDs, and stable `BILLING_INSTANCE_ID`. Live mode requires HTTPS and all six plans. Keep `BILLING_MANUAL_ENABLED=false` with live keys.
4. Register `https://YOUR_API_HOST/api/billing/webhook` with Razorpay. Subscribe to `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`, and `subscription.updated`. The webhook validates the raw body against `X-Razorpay-Signature`, deduplicates `X-Razorpay-Event-Id`, and fetches provider state before changing entitlements.
5. Test all six plans in Razorpay test mode, including first payment, failed renewal, retry, duplicate webhook, cancellation, and expiry. Verify actual payment methods enabled in the Razorpay account. Run backend tests and the frontend build before live launch.

## Access and migration

A redirect from checkout never grants access. The backend verifies a paid invoice with the selected fixed-package amount and a billing period, then records the paid-through date. An unpaid or failed invoice does not extend access. Existing Free/manual dates and billing history remain intact until a verified paid transition. Old paid-provider records remain historical and are not automatically canceled or migrated; any still-recurring old agreements must be stopped separately in that provider's dashboard before taking a new Razorpay subscription, to avoid duplicate charges. A current paid Razorpay subscription can be cancelled at the end of its paid period from AccrueHR. Changing a plan requires ending the current agreement first.

Razorpay docs: [Create Subscription](https://razorpay.com/docs/api/payments/subscriptions/create-subscription), [Subscription webhooks](https://razorpay.com/docs/payments/subscriptions/subscribe-to-webhooks), [Webhook signature validation](https://razorpay.com/docs/webhooks/validate-test), [Supported subscription payment methods](https://razorpay.com/docs/payments/subscriptions/supported-payment-methods).
