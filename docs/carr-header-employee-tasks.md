# CARR header and employee tasks

The existing CAR reference design is retained. The header adds task search, the accessible-company selector, notifications, a user-profile link and the existing Redux logout action. The sidebar adds Back to GRECHA HRMS. Tasks and My Tasks sidebar entries are removed, as requested; task URLs and the Home task action remain available. Home shows assigned-task counts from the existing scoped task API.

Employees select View My Tasks on Home and use Work & review to save title, description and due date, alongside the existing status and progress controls. PATCH /api/carr/tasks/{id}/details validates the fields and uses the existing company and ownership/manager visibility checks. Submitted, completed and cancelled tasks reject details changes. Assignment, review rules and instruction fields remain manager-controlled. Changes are saved transactionally and audited; standalone task wrapper titles/descriptions stay synchronized. The task list refreshes after saves, and Home loads current task counts on navigation.

Validation: 26 CARR service tests and 10 accountability/routing/metrics tests passed; the application packaged successfully. Chrome verified the reference UI at desktop/mobile widths, search navigation, profile link, HRMS return link and logout. A separate mocked Chrome test verified permitted fields, save payloads, progress and list refresh without database mutations.

Live database fixture verification was not run because an authorized employee fixture account was unavailable. Existing credentials were preserved. API regression assertions cover detail persistence and isolation when an authorized fixture account is available.

Accountability now requires at least one fully named KPI, a numeric target for each KPI, and integer weights totaling 100%. Empty KPI rows can no longer be filtered out and submitted accidentally. Form submission before the final review step is ignored. Three validation tests and an isolated Chrome form check cover these regressions without database writes.
