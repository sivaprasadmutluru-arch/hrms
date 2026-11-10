# Dashboard navigation — 2 November 2026

Dashboard summary cards now use keyboard-accessible React Router links to the relevant organization, employee, company, department, leave, internal helpdesk and finance modules. Destinations respect role restrictions and position exclusions. Branch/HR daily attendance cards link to employees or attendance. Calendar and notifications headings link to their full views; quick actions use client-side navigation.

Role-specific dashboard sections follow role precedence, preventing duplicate company/admin cards when an account has both platform and enterprise roles. The branch table heading no longer hardcodes five slots.

Verified the running platform administrator dashboard contains one set of summary links, clicked Total Employees and confirmed /employees and Employees heading, then clicked Pending Leaves and confirmed /leave and Leave Management heading. Production build passed and was packaged. No business records changed. Screenshot: /private/tmp/accruehr-dashboard-navigation-fixed.png.

Summary links open the relevant module; active/inactive and pending/open card counts do not automatically apply a list filter.
