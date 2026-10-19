# Role-based KPI configuration

The existing CARR KPI table stores suggestions, configuration, actuals and evidence. No external AI service is required. Suggestions are an explainable starting point for administrator review, not industry benchmarks or approved business targets.

## Workflow

Select the company in the existing company selector. Create a CAR and select the department, employee and job title. At **Accountability**, choose the review period and **Auto-Generate KPIs**. Review the preview, apply suggestions, adjust targets and weights, and inspect **Details** for the metric definition, source, actual, cycle and scoring formula. The existing CAR review screen previews the agreement before submission.

The direct `/carr/kpis` workspace supports existing employee agreements, a department filter, draft configuration preview/save, and refreshing connected actuals. Approved/published agreements keep their configuration locked. Assigned managers and HR administrators can enter evidenced manual actuals after approval.

Suggestions first reuse an approved configuration with the same job title or selected role template in the current company. Otherwise, designation, job role, job position, department and responsibilities select a role-specific metric set. Unrecognised roles use responsibility-derived outcomes and employee-owned task measures. Suggested monetary and lead-count targets require business configuration; the initial value of 1 is explicitly flagged in Details and is not a business target recommendation.

Regeneration previews changes. It preserves custom and manually edited KPIs, including their weights, by default. New measures share the remaining weight. If preserved measures already consume 100%, adjust weights first or explicitly confirm replacement in the preview. KPI names and generated metric identities are deduplicated. Approved configurations cannot be regenerated in place.

## Measurements and scoring

- `TASK_COMPLETION`: completed assigned tasks due in the selected period divided by non-cancelled assigned tasks due. Completion must occur by the calculation cutoff.
- `TASK_ON_TIME`: the same due-task cohort, with completion by both the task deadline and calculation cutoff.
- `ATTENDANCE_COMPLIANCE`: regular or approved regularised days divided by processed attendance days with checkout. Excludes holidays and unprocessed records; approved leave has no processed attendance and is not penalised. This is processed-day compliance, not a scheduled-day absence rate.
- `MANUAL` and other custom sources: enter a verified actual and source evidence. Finance, sales, code quality, recruitment and onboarding outcomes are manual until a reliable owner/period/source mapping is configured. The presence of a module alone does not establish that attribution.

The calculation cutoff is the earlier of today and the period end. Empty denominators, future periods, missing period dates and unknown completion dates yield a null actual. Trace evidence records the numerator, denominator, source table, bounded record IDs, date window and calculation timestamp. Source queries filter by company and employee. Automatic actuals are recomputed on configuration save and on an explicit refresh; manual values cannot override connected sources.

Higher-is-better: `actual / target * 100`. Lower-is-better: `target / actual * 100`, with a measured zero meeting a positive target. Maintain-target: `(1 - abs(actual - target) / target) * 100`. All scores are clamped to 0–100. Weighted contribution is score multiplied by weight / 100. Targets must be positive, units required and weights integer percentages totalling exactly 100. Missing observations remain null and display **Not Scored**. The overall result remains null until every measure is scored and weights total 100; partial coverage is displayed separately.

Configuration saves retain existing KPI IDs, avoid replacing task responsibilities, and record a snapshot of targets, weights, cycles, actuals, definitions, directions, source evidence and review period in existing CARR audit events. Mutating record operations acquire a company-scoped row lock to serialize concurrent configuration changes.

## Database rollout

Back up the database, then run `src/main/resources/db/migration/V21__carr_kpi_generation.sql` once before starting the new backend. This repository does not automatically execute migration files. The script updates existing KPI tables in public and tenant schemas, adds three metadata columns, and removes the actual-value NOT NULL/default constraints. Legacy zeroes without evidence become null because their provenance cannot establish a measured observation. Other observations remain intact. No new tables are introduced. Hibernate continues creating the columns for newly provisioned tenants; the opt-in CARR schema runner includes the structural changes for existing tenants.

For the New_Grecha local installation, the migration was applied to the isolated database on port 5434 after writing `.runtime/kpi-before-migration.dump`. The older installation was not modified.

## Verification

Backend tests cover scoring boundaries, missing data, role selection, company configuration precedence, employee-owned task windows, attendance filtering, weight/duplicate validation, approval locks, cross-company lookup, actual-update permissions, stable IDs and audit snapshots. Existing task-service tests run alongside them. Frontend model tests cover balancing, missing actuals, deduplication, regeneration preservation and input validation. Browser checks exercise the creation wizard and existing KPI workspace at desktop/mobile sizes, custom measures, validation, Details, preview and keyboard dismissal.

Reference for the requested HRMS conventions: [Horilla performance management](https://www.horilla.com/features/pms/) and [key-result definitions, current values, targets and periods](https://www.horilla.com/blogs/what-are-the-best-practices-for-creating-effective-okrs-in-2023/). The formulas and integration mappings above describe this implementation.
