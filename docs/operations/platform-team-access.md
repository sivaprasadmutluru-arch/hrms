# AccrueHR platform team access

Implemented 3 November 2026. Platform duties supplement existing employment roles. They do not grant customer workforce, payroll, accounting or internal helpdesk access.

| Role | Platform duties |
| --- | --- |
| Platform Super Admin | Existing platform administration, including platform role assignment and revocation |
| Organization Operations | Customer organization directory, organization creation with its first enterprise administrator, logo and contact details |
| Platform Support | Organization-to-AccrueHR support queue, replies, assignment and status updates |
| Platform Billing | Organization billing overview, subscriptions, invoice history and renewals; manual activation only when enabled by deployment configuration |

Organization Operations cannot suspend/delete organizations, change plans, alter country, or manage platform role assignments. Customer administrators retain their existing organization-scoped HR and helpdesk permissions.

## Internal organization configuration

Apply backend migration V47. Then explicitly bind `public.platform_operator_configuration` (singleton id 1) to the verified internal operator organization ID. The migration deliberately leaves this binding empty. Organization names/slugs do not confer trust. Local configuration is bound to verified Accrue Technologies organization 145, head office 337; these IDs are local only and must not be copied to another deployment.

## Assigning duties

As Platform Super Admin, open Roles & Access and select an active internal employee, a platform duty role, and that employee's internal employment company. The assignment uses SELF scope; effective date, expiry date and a reason are recorded in the existing role audit log. New platform roles receive only their fixed platform permission, regardless of extra database permission mappings.

No existing user was automatically assigned any of these roles. Employment alone never confers platform access. Runtime authorization checks the persisted assignment, dates, internal organization binding, active company/organization, employee record and EMPLOYEE assignment. Revocation, expiry, employment archive or transfer removes the delegated capability on the next request. Other separately assigned roles retain their existing access.

Organization creation uses a narrow internal first-administrator provisioning path: it accepts only ENTERPRISE_ADMIN for a user and company with no existing assignments. It cannot grant platform roles. Contact edits ignore plan, quota and status fields. Creation and contact edits are audited without initial administrator passwords.

## Verification

49 targeted backend tests passed: 18 platform authorization integration tests and 31 billing regressions. Tests ran in a disposable database, without granting new duties to real employees or sending test email. Checks include separate duties, customer employee rejection, forged organization name, scope expansion rejection, grant restrictions, role revocation/expiry, employment archive/transfer, foreign support/billing isolation, support reply/resolution, contact update isolation, permission mapping tampering and initial customer administrator provisioning. Frontend production build passed.

Live Stripe readiness still depends on the existing provider configuration; adding Platform Billing does not enable a payment provider or change existing subscriptions.
