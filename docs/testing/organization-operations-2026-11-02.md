# Organization billing, support and billing emails — 2 November 2026

Implemented platform-wide billing tracking, organization-scoped AccrueHR support, invoice payment environment tracking, and the user-approved automated billing notices. Operating instructions and schema-release details: ../operations/organization-billing-support.md.

## Verified

45 targeted backend tests passed (0 failures/errors):
- PlatformOperationsIntegrationTest: 11 — organization isolation, owner-only support, platform-only status/assignment/billing access, immutable reply/activity history, reopening, pagination/filtering, employee denial, expired subscription support access, archived organization billing visibility and LIVE/TEST/UNKNOWN payment separation.
- BillingNoticePolicyTest: 4 — IST reminder windows, expiry/past-due precedence, Free/legacy/Stripe-test exclusion and effective cancellation date.
- BillingNoticeIntegrationTest: 7 — registered-contact delivery, explicit head-office fallback, per-period de-duplication, failed-delivery backoff/max attempts, missing contacts, uncertain SENDING claims and new subscription periods. EmailService was mocked; no real email was sent.
- Existing billing regressions: BillingServiceTest 14, BillingSecurityTest 4, BillingSubscriptionTest 5.

Frontend production build passed and was packaged into backend static resources. Local backend restarted with existing private runtime settings.

Browser checks on an isolated database exercised request creation, platform reply, assignment and resolution with the recorded activity trail, plus billing detail/history. Real support data was not created. A final read-only browser check on the running local app verified billing inventory and email delivery history. All temporary test tabs, the test backend/frontend and hrms_ops_test database were removed.

Live post-check: one existing employee, zero real support requests and zero billing email notices. Current Accrue Technologies subscription is Free, so it correctly has no renewal/expiry emails. Existing payments and subscription dates were not changed.

Approval: user explicitly approved automatic billing name/plan/renewal-date/payment-status emails to organization contact_email with head-office email fallback, and the reminder schedule, before enabling delivery. SMTP acceptance/inbox receipt for a real billing notice has not been exercised; this task did not invent a due payment or change a live subscription to force an email.

Evidence: /private/tmp/hrms-ops/final-billing-email-tracking.png (running local app); /private/tmp/hrms-ops/support-verification.png (synthetic test database activity).

## Operational limits

Support replies currently stay in-app. Billing email delivery requires a valid registered contact and SMTP. Public links require the deployed APP_FRONTEND_URL. SMTP does not support exactly-once delivery: abandoned SENDING records require operator review, and transport failures can be ambiguous. Existing provider keys/public deployment and offline payment accounting remain separate work.
