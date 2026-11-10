# Stripe subscription billing

The application supports Stripe-hosted recurring checkout, customer billing management, verified webhook synchronization, invoice history, and expiry enforcement. Live payments remain disabled until all environment settings below are present. Never put secret keys into the frontend, source control, or chat.

## Deploy and configure

1. Back up PostgreSQL. Apply `src/main/resources/db/migration/V24__stripe_billing.sql` to the public schema before starting the release with `DDL_AUTO=validate`. The repository does not run Flyway automatically: run this SQL explicitly through your deployment migration process. It is safe to rerun.
Apply V25–V32 in order for the subsequent billing, profile, templates, organization-size, and seat changes. Existing subscriptions are preserved. Replace any old flat-rate price configuration with the new fixed-package price IDs before enabling Stripe. Free needs no Stripe price.
2. Create three Stripe products and six recurring INR fixed package prices (Checkout quantity is always one). Values in the API are minor units (paise):

   | Plan | Monthly price | Yearly price | Monthly minor units | Yearly minor units |
   | --- | ---: | ---: | ---: | ---: |
   | Basic | ₹1,000 | ₹12,000 | 100000 | 1200000 |
   | Standard | ₹4,000 | ₹48,000 | 400000 | 4800000 |
   | Enterprise | ₹9,000 | ₹1,08,000 | 900000 | 10800000 |

3. Set the variables in `.env.billing.example` in your backend service's secret environment. Spring reads process environment variables; it does not automatically load a `.env` file. Use separate Stripe test and live keys/prices. `BILLING_INSTANCE_ID` must remain stable for this database and be distinct for unrelated deployments sharing a Stripe account.
4. Enable the Stripe customer portal. Limit subscription changes to the six configured prices; disable quantity changes and trials. Configure cancellation at the end of the billing period and review Stripe's payment retry, failed-payment, and proration settings. The user sees and confirms payment/proration inside Stripe. HRMS never advances an entitlement from a plan change alone.
5. Register `https://YOUR_API_HOST/api/billing/webhook`, API version `2025-03-31.basil`, and copy its signing secret into `STRIPE_WEBHOOK_SECRET`. Subscribe to:
   - `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`
   - `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `invoice.voided`, `invoice.marked_uncollectible`
6. Set `BILLING_FRONTEND_URL=https://YOUR_APP_HOST`. This is a server-controlled return destination; browsers cannot provide arbitrary redirect URLs. Live keys require HTTPS and all six unique price IDs. Match tax-inclusive/exclusive Stripe prices to your chosen catalog pricing. Enable `STRIPE_AUTOMATIC_TAX=true` only after configuring Stripe Tax, product tax codes, and registrations in your account. Actual invoice totals, including tax, are saved from Stripe.
7. Keep server clocks synchronized and allow outbound HTTPS to `api.stripe.com`. Keep the webhook publicly reachable, without interactive login, while retaining Stripe signature verification. A reverse proxy should limit this endpoint's body size to 1 MB. No card data is stored in HRMS.

## Lifecycle and data

- `public.billing_subscriptions`: one record per organization. Tracks plan, monthly/yearly cycle, Stripe customer/subscription IDs, start/current period dates, confirmed paid-through date, cancellation/termination dates, expected recurring amount/currency, mode, and synchronization health. Each organization and all its branches share a subscription.
- `public.billing_invoices`: provider invoice ID, number, state, amounts due/paid, currency, paid timestamp, provider period, and links to Stripe's hosted invoice/PDF. The invoice ID prevents duplicate payment-history entries.
- `public.billing_events`: verified event ID, organization, type, payload digest, and processing timestamp. Processing and marking the event occur in one database transaction.
- Prices and plan limits come from a server catalog. Checkout verifies the configured Stripe price's amount, currency, and interval. No browser-provided amount is accepted.
- Dates come from Stripe subscription items and paid invoice line periods. Monthly/yearly are calendar billing cycles, not 30/365-day guesses. Storage uses UTC instants; the UI displays IST.
- The redirect after checkout cannot activate access. Verified webhooks or an authenticated server-to-Stripe refresh must confirm a paid invoice covering the current item period.
- Past-due payment does not extend access. Access ends at the confirmed paid-through timestamp, even if an expiry webhook is delayed. No extra grace period is enabled. Cancellation at period end retains access until that timestamp; immediate termination and unpaid/paused states revoke access.
- Plan upgrades require a paid invoice for the new price. Failed upgrades retain the previously paid plan. Existing records are not deleted when a downgrade has less capacity; employee/branch creation remains subject to the new limits.
- Old event snapshots are not applied directly: the latest subscription is retrieved under an organization lock. Duplicate deliveries do not produce duplicate invoices or grants. Customer/organization metadata and deployment instance are checked before mutation.
- Unfinished checkouts are reused, expired sessions can be replaced, and generation-based idempotency keys prevent retry requests from creating another subscription. An existing subscription opens the Stripe portal rather than a second checkout.
- Background reconciliation checks up to 100 existing subscriptions/pending checkouts every five minutes on a separate worker, so it cannot stall payroll schedulers. Failed attempts expose a generic sync warning and are retried. Stripe remains the authoritative historical billing system; portal invoices are available if a webhook delivery was permanently missed.
- Billing access is limited to Platform Admins or effective organization-wide administrators of that organization. Branch managers and employees cannot see invoice history or start billing sessions. Expired workspaces retain authentication and billing routes so their administrator can renew. Platform Admin support access is exempt from workspace expiry, not from payment verification.
- Existing organizations are migrated as `LEGACY`: no purchase/start/expiry dates are invented, and their existing access is preserved. Their first confirmed Stripe payment switches them to normal paid access. Newly created organizations start `NOT_SUBSCRIBED`; they receive no paid access until confirmation.
- Direct plan mutations through the old organization update/subscription APIs are disabled. Organizations with Stripe billing history cannot be permanently deleted through the application; suspend them to retain financial records.

## Verification before going live

Run backend `mvn -Dfrontend.skip=true test` with Java 21+ and the frontend build. Use Stripe test mode and the Stripe CLI to forward webhooks to `http://localhost:8081/api/billing/webhook` with the CLI-provided signing secret. Exercise real test-mode Checkout and Portal flows for all six prices, including failed initial payment, failed renewal, end-of-period cancellation, immediate termination, a paid upgrade, failed upgrade, duplicate delivery, and recovery after missed webhooks. Confirm server and Stripe period boundaries match. Use Stripe test clocks to advance calendar periods rather than editing paid dates in PostgreSQL.

The local automated tests do not replace these account-specific test-mode checks. No live charge or subscription was created while implementing this integration. Changing the displayed prices requires matching new Stripe prices and updating the server catalog; do not silently repurpose an existing price ID.

Reference documentation:
- [Stripe Checkout subscriptions](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Checkout Session API](https://docs.stripe.com/api/checkout/sessions/create)
- [Customer portal sessions](https://docs.stripe.com/api/customer_portal/sessions/create)
- [Webhook management and verification](https://docs.stripe.com/events/manage-webhook-endpoints)
- [Subscription item billing periods](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end)

## Temporary payment bypass

Apply `V25__manual_subscription_activation.sql` before deploying this option. `BILLING_MANUAL_ENABLED=false` is the default. It may be enabled temporarily for local evaluation or explicit administrative grants, and startup rejects enabling it together with live Stripe keys. Only Platform Super Admins can use `POST /api/billing/organizations/{id}/manual-activation`; normal organization administrators cannot bypass payment.

The request records a monthly/yearly manual access grant with calendar start/end dates, actor, reason, and an idempotency request UUID. No Stripe invoice or successful payment is fabricated, and the amount collected is zero. Repeat requests with the same UUID do not extend the term again. Early renewal of the same plan/cycle extends from the existing expiry while preserving month-end/leap-day anchors. A different plan or cycle starts a new term immediately. Manual access expires at its stored boundary and does not automatically renew. Existing Stripe billing accounts cannot be overridden through this endpoint. Disabling the feature prevents new manual grants; existing granted terms continue until expiry.
