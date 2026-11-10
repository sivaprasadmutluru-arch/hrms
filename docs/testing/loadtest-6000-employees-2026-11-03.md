# AccrueHR load test — 3 November 2026

**Result: this local setup did not sustain 200 concurrent clients.** Normal application data was not used or modified.

## Dataset and environment

30 isolated tenant organizations × 200 synthetic employees = **6,000 employees**. Additional fixtures: 180,000 attendance records, 18,000 confirmed payslips, 6,000 leave requests and 6,000 initial tickets. The fixture database is approximately 375 MB.

A separate backend on `127.0.0.1:8082` used database `hrms_loadtest_20261103`; the normal app stayed on port 8081. PostgreSQL ran in the existing local Docker VM with **2 CPUs / approximately 2 GB RAM**. JVM maximum heap: 1,536 MiB; Hikari pool: 50. Host and database resources were shared with the normal local app, so this is not an isolated production-capacity measurement.

## Workload

Closed-loop clients with 50–150 ms think time and a 20-second client timeout. 231 synthetic sessions were authenticated during setup (30 organization owners, 200 employee users and one platform fixture). Continuous traffic mixed 70% employee self-service and 30% admin workflows. Tests covered employee lists and dashboards, organization charts, attendance, leave, payslips, salary sheets, accounting ledger, ticket reads/creation, departments, recruitment list, Excel export and identity refresh. Recruitment and general-accounting ledger reads had empty business content; payroll, attendance, leave and helpdesk had populated fixtures.

## Measured stages

| Concurrent clients | Configured duration | Requests | Failed | Failure rate | p95 elapsed | Successful requests/s |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 15s | 61 | 0 | 0.0% | 0.69s | 3.98 |
| 10 | 30s | 651 | 0 | 0.0% | 1.54s | 21.09 |
| 50 | 45s | 884 | 1 | 0.113% | 11.61s | 17.92 |
| 100 | 60s | 1012 | 233 | 23.024% | 20.00s | 9.78 |
| 200 | 90s | 1000 | 1000 | 100.0% | 20.00s | 0.0 |
| 10 (recovery) | 20s | 10 | 10 | 100.0% | 20.00s | 0.0 |

**Total:** 3,618 workload requests; 2,374 succeeded, 1 returned HTTP 500, and 1,243 ended in client-side timeouts. p95 values in timeout-dominated stages represent observed client elapsed time, not completed server response time. Configured durations exclude the time needed to finish in-flight requests, so actual stage duration can be longer.

## Correctness and access checks

- All 13 owner-workflow preflight checks passed.
- All 30 attempts to read employees using another organization’s company header were rejected with HTTP 403.
- Sample employee self-service identity and own-payslip reads passed; employee accounting access was rejected.
- Employee-list responses checked selected company, synthetic email domain and 200-record total during load. No detected cross-tenant mismatch was recorded. This does not prove isolation for every endpoint.

## Findings and next fixes

1. **Database-pool saturation:** the thread sample showed 150 HTTP threads waiting for connections while all 50 pool connections were busy. Investigate query volume and transaction lifetime before increasing pool size.
2. **Accounting initialization race:** concurrent salary export hit a serialization failure in account-chart insertion. Initialize accounts outside read/export paths or add an appropriate bounded retry around an idempotent provisioning transaction.
3. **Helpdesk query amplification:** unpaginated company ticket reads plus per-ticket reloads/lazy relationship reads were the slowest workflows. Add pagination and a batched DTO/fetch query; separately verify employee-only ticket visibility.
4. **Startup readiness:** sequential schema synchronization of 30 tenants took approximately 6.5 minutes. Move expensive schema upgrades to a controlled migration process and expose readiness separately from socket availability.

The immediate 10-client recovery probe also timed out. Pending server work was still present; the isolated test backend was stopped after evidence collection. A longer cooldown/recovery test is needed after the bottlenecks are fixed.

## Boundaries and retained artifacts

No production capacity certification, prolonged soak, browser rendering load, tenant creation benchmark, external-provider traffic or full statutory/financial validation was performed. Automatic real email and payment integrations were disabled in the isolated profile. The normal backend remained reachable (unauthenticated API probe returned HTTP 401 in 79 ms); its database still contains zero `Load Organization` records.

The 375 MB synthetic database is retained for a follow-up run. The isolated backend is stopped. Synthetic credentials and diagnostic thread dumps remain in owner-private temporary/runtime storage, not this report or Git.

Reproduction uses [fixture preparation](../../scripts/loadtest/prepare.py) and [HTTP runner](../../scripts/loadtest/run.py); these are intentionally restricted to the named disposable database and port. Bootstrap schema snapshots and private fixture credentials must be prepared first. Detailed endpoint/stage observations are in [the JSON report](loadtest-6000-employees-2026-11-03.json).
