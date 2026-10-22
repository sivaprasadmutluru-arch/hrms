# CARR KPI business rules

## Employee identity

Assigned To is the first field. Job Title is read-only and comes from the selected employee's Job Position in the Employee module. The backend validates that designation before saving a CAR or generating suggestions. A task, project name or responsibility cannot replace it.

## Generation and target provenance

The Accountability step automatically generates a new empty configuration. Regeneration preserves custom and edited measures unless replacement is explicitly selected.

The engine uses the selected employee's active assigned PMS objectives, CARR deliverables and project deliverables. Existing PMS objectives assigned across employees supply company objectives; each employee's achievement is measured from their own assignment, never the owner's progress. Approved CAR measurement rules for the same company, department and designation provide existing company standards. Bound deliverables belonging to another employee are excluded.

Explicit numeric responsibility targets are preserved, including a 95% onboarding requirement. Concrete agreed deliverables use a full-acceptance target of 100%, with an explicit acceptance rule. Other role measures start without a numeric target if no approved standard exists. Authorised users must configure the target, measurement criteria and any SLA, quota, currency or acceptance parameters before saving. Equal initial weights are editable and must total 100%.

Role standards are fallback suggestions, not a fixed list of examples. Assigned objectives, deliverables, responsibilities, approved company rules and custom measures extend them. Bulk employee setup creates drafts without fabricated generic KPIs; employees missing Job Position or department require configuration.

## Measurement and scoring

- A linked CARR outcome scores 100% actual only after COMPLETED with a dated completion on or before the measurement cutoff. Pending review does not count as acceptance. Otherwise its binary acceptance actual is 0%; missing completion dates remain unscored.
- A linked project deliverable measures DONE as 100% and other stages as 0%. Stage names do not imply invented partial percentages. Historical results remain unscored when no dated source snapshot is available.
- A directly owned PMS objective uses stored progress from 0 to 100%, with COMPLETED measuring 100%. Missing or invalid progress remains unscored. A shared objective uses the employee's assignment status, without copying the owner's numeric progress.
- Existing task-completion, on-time-delivery and processed-day attendance sources remain available as explicit measures. They are not added as generic KPIs for every role.
- Live linked observations are calculated for non-archived CAR responses and on save or refresh. Read projections do not overwrite configured data or archived actuals.
- Manual observations require verified source evidence. Unavailable sources and missing historical observations stay Not Scored, distinct from measured zero.

Higher-is-better score = actual / target x 100. Lower-is-better score = target / actual x 100; measured zero meets a positive lower-is-better threshold. Maintain-target score = (1 - absolute deviation / target) x 100. Scores are capped from 0 to 100. Weighted contribution = score x weight / 100. Overall scoring requires all KPIs measured and weights totalling 100%.

Each KPI carries its title, employee, designation, description, measurement criteria, target, actual, start date, deadline, weight, score and status. Start date inherits the CAR review period. An individual deadline can be configured within that period. Automatic measurements stop at the earlier of today, that deadline and the review end. Status is Not Started, In Progress, Completed or Overdue; a missing observation never creates a score.

## Isolation and workflow

Employee and source ownership are checked against the active company. Source IDs from another employee or company are rejected during configuration and never reveal measurements. Approval and actual-update permissions are retained. This change does not write to Employee, Project or PMS records.

Migration V22 adds an optional outcome description to all existing tenant KPI tables. Migration V23 allows unmeasured actuals to remain NULL and removes any fabricated default, without rewriting existing observations. The opt-in CARR schema synchroniser and new-tenant entity provisioning include the field. Deploy both frontend and backend and apply the migration before using the new response fields.

## Verification

Focused backend tests cover employee designation, target provenance, company-approved configuration, linked-source isolation, objective assignment privacy, deadlines, missing historical observations, measurement and scoring. Frontend tests cover validation, score/status calculation, missing targets and regeneration protection. The production frontend build is also checked.
