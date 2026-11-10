# Portable careers verification — 2 November 2026

- 15 CareersIntegrationTest tests passed against the disposable hrms_portable_test PostgreSQL database, with SMTP explicitly disabled. Includes published-job filtering, application creation, duplicate checks, resume restrictions, HR scope, public GET CORS without credentials, denied cross-origin POST, cross-organization job access rejection and 429 throttling with Retry-After.
- Frontend production build and widget JavaScript syntax checks passed.
- Browser test loaded the classic script from localhost:5173 into a separate website on localhost:5180. Verified the actual organization and published job rendered in the shadow root with a correctly scoped hosted Apply link. Retry successfully recovered after backend restart. No candidate was submitted and no email was sent during this task.
- Browser verified Recruitment → Job Posts → Website integration exposes the correct careers URL, anonymous script snippet and jobs-feed URL for Accrue Technologies.
- Final backend HTTP checks verified wildcard credential-free CORS on the static widget and public jobs feed. Existing authenticated HR CORS configuration retained.
- Production assets copied to backend static resources; local backend restarted with existing private runtime settings.
- Temporary verification tabs/server/database removed. Live jobs/candidates/employees were not modified.

Screenshot: /private/tmp/hrms-portable-widget.png.
Deployment instructions and remaining operator requirements: docs/integrations/portable-careers.md. External hosting/DNS/TLS, actual customer website installation and shared edge throttling for a multi-node rollout are not provisioned by this local change.
