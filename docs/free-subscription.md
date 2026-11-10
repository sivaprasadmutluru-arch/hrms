# Free subscriptions

Apply `V30__free_subscription_plan.sql` before deploying with `DDL_AUTO=validate`.

The catalog contains Free, Basic, Standard and Enterprise. Free costs INR 0, allows 20 active employee records organization-wide and one branch in addition to head office, and has no billing cycle or expiry. Archived employees do not use seats. Creating or reactivating an employee checks the organization limit under its row lock.

New organizations continue to start in Legacy mode. An organization billing administrator selects Free after sign-in using `POST /api/billing/organizations/{id}/free-activation`. This endpoint checks organization authorization and usage, records an audit event, and requires neither Razorpay nor the manual-payment bypass flag. Repeated activation does not create another event.

Existing plans are not migrated. Usage must fit Free before switching. Active Razorpay subscriptions must be canceled through the portal before Free activation; pending Checkout sessions must expire. Old canceled-subscription notifications cannot remove Free access. A paid upgrade replaces Free entitlements only after a verified invoice. Razorpay still requires six recurring plans for the three paid tiers; no Free plan IDs are needed.

## Fixed-price packages

One package covers the organization, head office, and branches. Prices are INR:

| Plan | Included active employees | Branches | Monthly | Annual |
| --- | ---: | ---: | ---: | ---: |
| Free | 20 | 1 | 0 | 0 |
| Basic | 50 | 2 | 1,000 | 12,000 |
| Standard | 200 | 5 | 4,000 | 48,000 |
| Enterprise | Unlimited | Unlimited | 9,000 | 108,000 |

Basic and Standard use a minimum of INR 20 per included user per month. Enterprise is the authorized discounted exception. Annual plans equal 12 monthly payments; the former two-month discount no longer applies.

Checkout and manual activation accept a plan and billing cycle, with no seats argument. Razorpay quantity must be exactly one, and recurring plan IDs must match the fixed package amounts. Employee creation and restoration enforce the selected plan's total capacity. Adding employees within the package does not change its price.

Company restoration validates the full proposed active company tree before changing any active flags. It checks the head-office branch limit, organization plan branch limit, and active employees across existing and restored companies. Restoring a branch requires an active head office; restoring a head office checks all its branches together. Organization locking serializes restoration with employee/branch creation and plan activation. Existing seat-based agreements retain their capacity until explicitly converted at activation or renewal.

### Existing subscriptions

Deploying or viewing the catalog does not change current access, expiry, amount paid, or audit history. Previous purchased capacity remains in force until an explicit activation or verified package purchase. Renewal of the same manual plan and period extends the existing expiry without resetting its start date, and grants the fixed package capacity. Old seat columns are retained for transition/history compatibility. There are no Razorpay customers or purchased-seat subscriptions in the current local database; reconfigure six recurring fixed-plan IDs before enabling Razorpay. Existing live Razorpay agreements must be moved to new plans through an approved renewal process rather than relabeled as fixed packages.

Organization size remains a self-reported employee range required during registration. It does not choose or activate a subscription.
