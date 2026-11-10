# Employment lifecycle and email verification — 2 November 2026

Implemented hired-candidate enrollment, required onboarding checklist completion, explicit employee conversion with joining setup, duplicate protection and plan-limit enforcement. Existing employee enrollment uses an explicit candidate/employee link. Stage labels survive completion responses.

Offboarding preserves history, starts access removal on the effective exit date, reconciles overdue departures, and blocks completion for pending checklist tasks, outstanding assets and unpaid payslips. Platform administrators require explicit role transfer/revocation before offboarding. Completed workflows are read-only.

## Validation

- Full backend suite: 369 tests passed before the final SMTP regression addition.
- Focused lifecycle and SMTP checks: 21 passed after that addition.
- Password recovery: four additional mocked tests passed (email-link construction, failed delivery, token consumption and expired-token rejection).
- Frontend production build passed, and generated assets copied to backend static resources.
- Isolated database browser/API flow: hired candidate → checklist → completed onboarding → employee creation → repeated conversion returns same employee → immediate exit → completion rejected before clearance → tasks completed → offboarding completed with employment access ended. No live hiring, payroll or employee changes were made.
- Password recovery browser check: a token-bearing email link opens the new-password form directly; it no longer asks the user to copy a token. Email requests show check-your-email guidance.
- One user-approved onboarding test email sent to accruetechnologiesai@gmail.com through the real Gmail SMTP configuration. Email log status SENT confirms SMTP acceptance; inbox receipt was not independently verified. An earlier password-reset message to the registered Siva address also has SENT status.

## External setup still required

Stripe live checkout/webhooks require provider keys and recurring price configuration. Manual activation remains the user-requested temporary setup. Public hosting/domain and the production frontend URL must be configured before email links are usable outside this local computer. Gmail sender configuration does not create recipient mailboxes; users must have a working registered email address.

Proof screenshots: /private/tmp/hrms-lifecycle/password-reset-fixed.png and /private/tmp/hrms-lifecycle/offboarding-clearance.png. Tests used the disposable hrms_lifecycle_test database with live mail disabled.
