# Employee attendance requirement

## Configure

Select the employee's company, then Employee > employee profile > Work Info > Attendance requirement.
An authorised company administrator or HR manager selects Required or Exempt, provides today or a future effective date, enters a reason, and saves.
CEO/COO/designation and security roles do not automatically grant exemptions. Normal employees cannot change this setting.

## Behaviour

- Required is the default when no policy exists.
- Changes append to an effective-dated history with author, reason, and timestamps. Earlier attendance is preserved; backdating is rejected.
- The latest decision for an effective date wins. A future Required entry can restore ordinary attendance after a temporary exemption.
- Exempt working dates display `EXEMPT` / `EX` rather than Absent or fabricated Present. Approved leave, holidays, and week-off labels remain visible.
- No synthetic punches, hours, overtime, or work records are inserted.
- Check-in is not required, the self-service check-in button is replaced by an explanatory notice, and server-side check-in rejects unnecessary punches. An already-open session can still be checked out.
- Missing-punch lists, register absence totals, and attendance dashboards exclude exempt dates; late and short-hours deductions are not calculated for those dates.
- Leave entitlement, leave approvals, and approved unpaid-leave deductions are unchanged. Fixed-contract salary rules remain unchanged; hourly pay still requires actual recorded hours. Review any hourly contract before exempting an employee.
- No employee is automatically exempted during migration.

## Deployment

Back up production first. **Apply `R__employee_attendance_policy.sql` with the application database role before activating the new JAR:** production uses Hibernate schema validation, which runs before command-line startup tasks. The SQL is additive and idempotent and creates empty history tables/indexes in public and existing company schemas. The startup runner then rechecks existing schema coverage. Future schema provisioning includes the mapped entity. Deploy backend/web and rebuild/release mobile for its updated controls. Run regression and authenticated admin/self-service tests before broad employee rollout.

No production policy has been assigned by this implementation.
