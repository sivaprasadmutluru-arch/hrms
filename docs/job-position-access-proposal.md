# Job-position access proposal

Status: approved by the user on 1 November 2026. Existing positions remain unconfigured until an administrator saves an access profile.

## Access matrix

| Configured position profile | Data scope | Allowed actions | Excluded actions |
| --- | --- | --- | --- |
| CEO | Employee's organization, head office and branches | Full business administration: employees, departments, attendance, leave, payroll, assets, recruitment, onboarding, offboarding, performance, projects, documents, helpdesk and reports; organization subscription management | Platform administration, other client organizations, creating or deleting client organizations |
| COO | Employee's organization, head office and branches | View/create/edit employee records, departments, attendance, leave, recruitment, onboarding, offboarding and documents; attendance/leave/document approvals; operational reports | Payroll and finance administration, billing, permission administration, organization/company deletion, permanent employee deletion |
| Employee | Own employee records only | Own attendance, leave requests, documents, helpdesk tickets, performance information and payslips | Other employees' records, organization administration, payroll administration, billing and permission administration |
| Unconfigured position | No additional scope or permissions | Existing role access | No automatic privileges from a title such as CEO or COO |

Configure the profile explicitly under Setup → Job positions → Access. The position name is a label, not an authorization rule. Existing positions default to unconfigured; no automatic grants or demo assignments.

## Interaction with current roles

Position grants supplement explicitly assigned roles within their authorized organization. They do not remove an existing administrator or finance role. A COO who also holds an explicit finance role retains that finance access. To restrict such a user to COO access, an administrator must remove the broader explicit role.

An active employee link and active company role assignment are required. Revoked, inactive, expired or future membership must not be revived by a job-position profile. A company role must never provide access to unrelated client organizations.

## Administration and enforcement

Only an explicitly assigned platform administrator or company administrator can configure position access or assign/remove an access-bearing position. HR editors and position-derived executives cannot use ordinary employee editing to grant themselves new security access.

Apply permission and data-scope checks on backend requests as well as frontend navigation. Title changes, profile changes and revocations must be reflected on subsequent requests; refresh the frontend's effective access after changes.

Record the administrator, previous/new profile and scope, and timestamp for every policy change. Show the affected employee count before saving, retain audit history, and reject stale concurrent edits.

Do not reuse the current CEO permission set unchanged: it includes organization:create and organization:delete. CEO access must exclude these platform operations. Likewise, broad operational scope must not turn an employee's payslip permission into organization-wide payroll access.

## Required verification

- CEO access works in the authorized company tree and fails against another organization.
- COO can approve leave and attendance but cannot access payroll administration, billing or security configuration.
- Employees see only their own records and payslips.
- Removing a position profile or revoking company membership removes derived access on subsequent requests.
- Changing the title text alone does not grant access.
- HR editors cannot assign themselves or others to a privileged position.
- Existing explicit administrator assignments remain effective.
- API authorization, navigation and data scope agree.

## Implementation and operation

The editor is available under Setup → Job positions → Access for an explicitly assigned company or platform administrator. Choose Existing roles only, CEO, COO, or Employee, review the affected employee count, confirm, and save. Assign the corresponding job position on the employee record in that position's company.

The backend records policy changes and rejects stale policy versions. It reads active employment and policy data on subsequent authenticated requests; it does not write synthetic position grants to user_roles. Changing to Existing roles only removes the position grant while preserving explicit roles. Frontend access refreshes on window focus and every minute; backend revocation does not wait for that refresh.

Apply backend migration V27__job_position_access.sql before deploying the code. It creates empty public.job_position_access and public.job_position_access_audit tables; no tenant positions or existing user assignments are automatically modified. Position identifiers are always paired with their company identifier and resolved in that company's tenant schema.

Validation: full backend suite passed with 281 tests, followed by 19 focused position-access checks after the additional executive identity protection. Checks include transactional policy persistence/audit, stale version rejection, live revocation, organization boundaries, CEO billing, COO payroll/export/download denial, employee self scope and HR promotion denial. Frontend production build and targeted lint checks passed; unrelated pre-existing Sidebar lint errors remain.
