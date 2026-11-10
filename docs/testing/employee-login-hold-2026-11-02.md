# Employee login hold — 2 November 2026

Added independent Hold login / Resume login actions to the employee directory (cards and table). Each change requires a reason, with the actor, employee/company, account ID and before/after state saved in the tenant audit history as EmployeeLogin / LOGIN_HELD or LOGIN_RESUMED. Duplicate requests do not duplicate the audit event.

The hold applies to the linked login account across companies. Employment status, payroll and employee records remain unchanged. Removing a hold does not reactivate an inactive account or restore revoked roles. Letter generation/sending remains independent of login access.

Backend requires a company header and authorized administrator role, checks the employee belongs to that company and locks the account for changes. Self changes and platform-admin targets are rejected. Company-scoped operators cannot hold accounts with effective assignments beyond their company scope; administrator accounts require platform administration. Audit persistence is part of the same transaction as the hold change.

UserPrincipal checks both account activity and login_held. Password authentication and the JWT filter reject held users; existing tokens stop authenticating on their next request while held. A hold does not erase a token: an unexpired token may work again after the hold is removed. Password reset does not remove a hold.

Validation: frontend production build; EmployeeLoginHoldTest covers hold/resume, preserved inactive state, required reason, idempotency, company boundaries, self/platform protection, correct-password rejection and bearer-token rejection. Local database applied additive migration V40; backend restarted. Browser verified the real employee list and reason dialog without holding any real account. Screenshot: /private/tmp/accruehr-employee-login-hold.jpg.

Deployment: apply src/main/resources/db/migration/V40__employee_login_hold.sql before deploying the backend. Existing accounts default to not held.

## Held-account sign-in message

Added ACCOUNT_ON_HOLD / HTTP 401 response and frontend handling: “Your account is on hold. Please contact HR.” The backend verifies the supplied password before returning the held-account detail; incorrect credentials continue to show the standard generic message. Added three tests for the message, wrong-password behavior and response contract. AuthPasswordResetTest (7) and EmployeeLoginHoldTest (12) pass; frontend build passes. No live employee account was held to test this message.

Archive review: backend bulk-archive uses the same inactive flag as Deactivate. The current employee directory has no separate Archived employees view; Leavers lists offboarding records, which is a different flow.
