# Helpdesk department managers — 2 November 2026

Replaced manual Department ID and Employee ID fields with searchable department names and employee names/email. Options are company-scoped, active-only and return minimal identity fields. Employee search runs on the server (50 matches with guidance to narrow search), and selected company context is sent explicitly even when a platform administrator was in All Companies mode.

The backend now derives company from the department, rejects missing selections/client-supplied assignment IDs, checks company scope for filtered reads and removal, enforces employee/department company equality, serializes duplicate checks by locking the department, returns a name-based response without full employee records, and handles repeated assignments idempotently. Removal deactivates the assignment; reassigning the same employee restores the existing row. Inactive employees/departments are not shown as active contacts.

DepartmentManagerIntegrationTest: 8 tests passed, covering named responses/server-owned company, duplicate assignment, cross-company employee rejection, scope bypass prevention for filtered reads/updates/removal, removal/restoration, inactive employees, scoped minimal search and invalid input. Tests used the disposable hrms_department_test database with mail and billing notices disabled. Production frontend build passed.

This feature records helpdesk department support contacts. It does not set the separate department leader field, grant login roles, change access permissions or automatically route tickets. Page text now explains this behavior instead of implying automatic routing.

No real contact assignment or permission change was made during verification. Local backend restarted with the fix and frontend assets packaged. Browser proof: /private/tmp/accruehr-department-manager-names.png.
