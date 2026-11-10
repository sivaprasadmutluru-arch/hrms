# Helpdesk detached responses and employee display names

The reported `Could not initialize proxy ... Employee#2 — no session` came from mapping service-returned detached Ticket entities. Merely starting a new transaction in the mapper did not reattach their existing relationship proxies. The mapper now reloads the ticket in its own transaction before reading requester, department, assignee and login data. Comments and attachments also use minimal DTO maps built from managed records, preventing the same failure in ticket details and excluding full employee/ticket entities from responses.

Ticket creation no longer reloads the entire queue before navigating to the saved ticket. That reload could fail after a successful creation and misleadingly report an error. Helpdesk server errors now show a plain message instead of raw exception details.

Login and /auth/me now include the employee display name and both name components separately from the username. The header, sidebar and profile fallback prefer employee first/last names. Phone-number login identifiers remain unchanged.

Validation: DepartmentManagerIntegrationTest (8), TicketRoutingIntegrationTest (10) and TicketDetachedResponseIntegrationTest (3). The new tests deliberately do not have a surrounding test transaction: they commit fixtures, create/read records through separate service transactions, assert the requester proxy is uninitialized on the detached record, and serialize actual controller responses. They cover list/detail, comments/attachments and /auth/me employee-name fields. Tests use the disposable hrms_ticket_session_test database with mail/billing notices disabled. Frontend production build passed.

No real employee or ticket records were created, altered or deleted to apply the fix. Local backend restarted with existing SMTP, local auth and website integration configuration. Browser proof: /private/tmp/accruehr-helpdesk-session-fixed.png.
