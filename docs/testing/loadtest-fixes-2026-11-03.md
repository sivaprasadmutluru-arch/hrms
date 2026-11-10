# Load-test remediation — 3 November 2026

Scope: 30 organizations, 200 synthetic employees per organization (6,000 total). Original baseline is in `loadtest-6000-employees-2026-11-03.md`.

## Implemented changes

- Helpdesk list/search/filter responses fetch department, requester, assignee and assignee login together and map the response within one read transaction. Removed the per-row ticket reload and second assignment-check reload. Filters run in SQL. Existing JSON array response is preserved.
- SELF access restricts ticket lists and direct ticket access to tickets raised by or assigned to the signed-in employee. Existing company/branch scope checks remain in effect.
- Accounting context/report reads no longer insert default chart accounts. Default accounts initialize only when the account catalog is opened/modified or a journal is written, under a per-organization database row lock. Salary and ledger export snapshot isolation is retained.
- Startup records a tenant model fingerprint after successful schema synchronization. Unchanged schemas are skipped on later starts; entity/mapped-superclass/embeddable bytecode, Hibernate version and provisioning implementation changes invalidate the fingerprint. A missing schema is never skipped. `app.tenants.schema-sync.force=true` forces a full repair/sync, including after manual database schema changes. Failures now stop startup rather than reporting completion with an unsynced tenant. Migration V49 supplies the version table; the runner also creates it for this project's deployments without a migration runner.

## Verification results

94 targeted tests passed: 64 helpdesk/accounting tests and 30 manager/access/attendance tests. The new database-backed manager tests verify work-profile overrides, explicitly cleared managers, inactive reports, company boundaries, and bounded chart-query counts.

A second optimization replaced per-colleague reporting-manager checks with a company-scoped SQL query and batched organization-chart profiles, labels and role assignments. These preserve the work-profile override semantics, including an explicitly cleared manager.

Final HTTP results (closed-loop mixed workload, 50–150 ms think time, 20-second client timeout):

| Clients | Requests | Failed | Failure rate | p95 |
|---|---:|---:|---:|---:|
| 1 | 95 | 0 | 0.0% | 0.14 s |
| 10 | 1634 | 0 | 0.0% | 0.21 s |
| 50 | 2754 | 0 | 0.0% | 1.95 s |
| 100 | 1190 | 33 | 2.77% | 18.34 s |
| 200 | 2195 | 475 | 21.64% | 20.00 s |
| 10 | 10 | 10 | 100.0% | 20.00 s |

The final row is the immediate 10-client recovery stage after the 200-client peak. It ran for only 20 seconds while earlier server work was still pending; it does not establish permanent failure to recover.

All 13 workflow preflights passed, all 30 cross-company requests were rejected, and employee accounting access remained denied. 7,878 measured requests: 7,360 HTTP 200, 518 client timeouts, **zero HTTP 500 responses**. No endpoint was excluded. The chart-of-accounts table remained empty in the disposable database throughout cold exports, confirming read requests no longer initialize it.

At 50 clients, p95 improved from 11.61 seconds to 1.95 seconds, with zero final-run failures. At 100 clients 2.77% timed out; at 200 clients 21.64% timed out. The remaining bottleneck is consistent with database-pool saturation during repeated authorization/company-scope checks; a peak thread sample showed waiting requests in JWT, billing and scope interceptors. This is an observed bottleneck, not a demonstrated claim that increasing the pool alone fixes it.

The unchanged 30-tenant schema check took **61 ms** on restart; the initial full model synchronization still took about 6.5 minutes. Overall startup remains longer because other bootstrap/model work still runs. Force synchronization after manual schema changes with `app.tenants.schema-sync.force=true`.

The local database VM has 2 CPUs and approximately 2 GB RAM and is shared with the normal app. This short benchmark is not a production capacity certification. It does not cover browser rendering, long soaks, failover, real payment/email delivery or statutory payroll correctness.

Earlier attempts were interrupted by disk exhaustion and PostgreSQL recovery. User-authorized Codex cache cleanup recovered approximately 10 GB; the completed runs had about 11 GB free. Regression databases and the 30-organization fixture were separate from normal application data. The isolated load-test server was stopped afterward.

Artifacts: [original baseline](loadtest-6000-employees-2026-11-03.json), [intermediate rerun](loadtest-6000-employees-fixed-2026-11-03.json), [final rerun](loadtest-6000-employees-final-2026-11-03.json). Private credentials, JVM thread dumps and raw resource samples remain under `/private/tmp/hrms-loadtest`; credentials are not included in these reports.

## Local activation

The verified fixes were activated in the normal backend on port 8081. Restart revealed an existing catalog-bootstrap defect: an installation using `accrue-technologies` as its operator slug gained an unwanted second default `accruehr` organization. Bootstrap now skips creation of that default when other organizations already exist. The automatically created organization (146) and head office (338), their seeded setup rows and empty tenant schema were rolled back in one guarded transaction; cleanup refused to proceed if employee/access or other-company data existed. The original organization (145), head office (337) and 14 user accounts were retained. The guard was compiled and existing manager unit tests were rerun successfully. Final normal-start verification checks that the default organization stays absent.

Final normal-start verification passed: bootstrap logged that existing organizations were retained; tenant synchronization completed; port 8081 responded with the expected unauthenticated HTTP 401; database counts were 1 organization and 14 users, with 0 default/synthetic organizations. Port 8082 was no longer listening.
