# Attendance exemption production release — 27 October 2026

Backend and web are live. Mobile source changes still require a rebuilt/distributed application; no Play release or new APK/AAB was produced in this deployment.

## Release

- Live and release JAR: `/opt/cloudhrms/cloudhrms.jar` and `/opt/cloudhrms/releases/cloudhrms-20261027-attendance-policy.jar`.
- SHA256: `011e95b0fede5e85fee4c7e700a1812659941a924abf2f488f1486f568a7b9a6`.
- Previous JAR backup: `/opt/cloudhrms/backups/cloudhrms-before-20261027-attendance-policy.jar`.
- Database backup: `/opt/cloudhrms/backups/cloudhrms-before-20261027-attendance-policy.dump`, 17 MB, root-only permissions; archive listing verified.
- Successful startup: 13:55 IST; PID `95609`.
- Web entry: `/assets/index-DFnApicJ.js`; verified employee detail asset `EmployeeDetailPage-jphLTeap.js`.

## Scope

Added effective-dated employee attendance policy history, scoped admin controls under Employee profile > Work Info > Attendance requirement, exemption-aware attendance/regularisation/payroll/reporting, and self-service web notices. Default remains attendance required. No employee policy, punch, leave balance, or payroll record was assigned/updated as part of deployment. All 10 policy tables were audited and contain zero rows.

Built on the exact preceding leave-actions production JAR, preserving its attachment endpoint and leave action menu. Only the 12 attendance-policy source classes, their generated nested classes, SQL resource, and web assets were selected. Unrelated probation/accrual/employee repository changes and CARR migrations were excluded. Existing hashed assets were preserved for open sessions.

## Migration and recovery

The additive migration passed a transactional dry run under `cloudhrms_user` across all 10 schemas, then rolled back. Initial activation exposed that production's Hibernate schema validation runs before command-line runners and blocked startup on the missing policy table. Applied the tested migration explicitly under `cloudhrms_user` and restarted. All tables are owned by the application role; current process startup succeeds without that validation failure. Future deployments must run migration **before** JAR activation; deployment script and feature documentation now state/enforce that ordering.

Rollback can restore the preceding JAR without removing the additive policy tables. Do not restore a database backup or delete tables unless separately necessary/authorised.

## Verification

- 36 focused backend tests passed: policy access/effective dates, attendance, regularisation, payroll, team attendance, and existing attachment tests.
- Release web build passed.
- Selected backend classes compiled against the actual deployed backend dependencies.
- Uploaded checksum verified and previous baseline checksum guarded before replacement.
- Successful startup, active service, local and public homepage HTTP 200.
- Anonymous policy endpoint HTTP 401.
- Public entry and employee-detail JavaScript bytes match release build.
- Current-process startup log contains successful application start; prior failed attempts are historical.
- Authenticated browser policy assignment and actual mobile-device behaviour were not manually tested. No real employee was used for a test assignment.

No Git push was performed.
