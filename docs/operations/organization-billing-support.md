# Organization billing and AccrueHR support

Platform administrators have two new navigation entries:

- **Organization billing** (`/platform/billing`): searchable organization inventory, plan/term, status, access/renewal dates, unpaid invoice count, support count, individual invoices, payment totals, billing event history and billing email delivery.
- **AccrueHR support** (`/platform/support`): organization-to-AccrueHR tickets, separate from the tenant's internal employee Helpdesk. Organization administrators see their own organization's requests; platform administrators see all organizations.

## Financial tracking

Manual activation is an access grant, not a payment. It remains in billing activity and never adds to recorded invoice payments. Stripe invoice IDs provide unique payment records. Invoice totals are separated by currency and LIVE/TEST/UNKNOWN environment; older invoices keep UNKNOWN until verified, rather than being guessed from the current subscription environment. These are recorded invoice payments, not accounting net revenue (refunds, tax reconciliation and offline receipts are not added by this change).

Archived organizations remain in the platform billing inventory. Organization support retains the organization name and its full conversation even if the organization is later archived. No ticket/message deletion API is provided.

## Support workflow

Organization admins submit a subject, category, priority and description. Each request has a durable SUP-number, creator/time, current assignee/status, first platform response timestamp and resolution timestamp. Platform replies move it to WAITING_CUSTOMER; customer replies move it to WAITING_SUPPORT. Customer replies to a resolved request reopen it. Closed requests require explicit platform reopening. Status, priority and assignment changes require a reason and append an immutable activity entry. Only platform admins assign or change status/priority through the admin controls.

Support remains accessible to an authenticated authorized organization administrator when the subscription has expired. Suspension/login controls still apply. Employee SELF access does not grant organization-admin support access. Support replies are in-app only; this change does not send support email notifications or promise an SLA.

## Approved automated billing emails

User explicitly approved this payload and destination on 2 November 2026: organization name, plan, access expiry/renewal date and payment-due status → registered organization Contact Email; if blank, the head-office email. Configure these in Organizations / company details. Missing/invalid contacts are recorded as delivery failures; they are not silently redirected to another address.

- Hourly scan, first scan 60 seconds after startup.
- Reminders on IST calendar days 7, 3, 1 and 0 before access ends, plus expiry and past-due notices.
- Free, legacy and Stripe TEST subscriptions excluded; manual paid-plan access and LIVE Stripe subscriptions included.
- SMTP resolves inside the organization's tenant, using its active configuration or the configured application SMTP fallback.
- Manual-access emails explicitly state no automatic charge is created. Stripe cancellation notices do not promise automatic renewal.
- Unique organization/type/period key plus atomic database claim prevents concurrent scheduler instances from processing the same notice. New periods get independent records.
- Failed deliveries retry with exponential backoff, at most five attempts. Errors visible to platform admins are generic and exclude credentials.
- SENDING is persisted before SMTP. An abandoned SENDING record represents uncertain delivery and must be reviewed against email logs, not automatically re-sent. SMTP cannot guarantee exactly-once delivery; transport ambiguity still requires operational review.
- Configure `BILLING_NOTICES_ENABLED=false` to disable scheduling. `BILLING_NOTICES_SCAN_MS` changes scan frequency. Public email links require the correct `APP_FRONTEND_URL` in production.

Platform billing details display recipient, notice type, period end, attempt count, sent/failed/uncertain state, sent time and next retry. General Email Logs still record underlying SMTP outcomes.

## Production schema release

Apply backend SQL migrations V36 (support tables + nullable invoice live_mode) and V37 (billing_notices) before starting with `DDL_AUTO=validate`. This repository does not automatically execute Flyway migrations; use the deployment's schema release process. Local development Hibernate update provisions these tables. Back up production before schema releases.
