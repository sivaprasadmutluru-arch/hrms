# Validation and error messages — 3 November 2026

Implemented shared frontend error normalization, including status-specific fallbacks, network/timeouts, JSON errors returned by file exports, and field-error preservation. Server details in 5xx payloads are not shown. Existing login and billing error/redirect semantics are preserved.

Employee and organization create/update thunks retain structured field errors. Their forms show these inline, focus the first affected field, retain entered values on failure, and keep Redux error banners as strings. Shared Input/Select controls associate labels and error messages with their fields; generic “Required” text includes the field name.

Employee validation covers whitespace-only first names, email/work-email format, future birth dates, negative experience/children, and negative or out-of-precision contract amounts. Optional email remains optional. Salary precision follows existing database columns (10 whole digits and 2 decimal places; hourly salary 8 and 4). Organization validation adds descriptive name/email/password messages and preserves the existing 6–100-character administrator password bounds.

Backend responses distinguish invalid/missing input (400), missing records/routes (404), unsupported method/media (405/415), duplicate/linked records and optimistic conflicts (409), oversized uploads (413), temporary database failures (503), and unexpected server failures (500). Global/object validation no longer casts every error to a FieldError. Database constraint names, SQL, rejected values and stack traces are not returned to users.

Validation: 11 frontend error-normalization/form-mapping tests passed (`node --test tests/apiErrors.test.js`); 16 standalone backend MVC/DTO tests passed (`ValidationErrorHandlingTest`); frontend production build and backend compilation passed. These tests do not use live email or alter application data. Live browser verification was blocked by the browser security policy; it was not bypassed. This is not a claim that every module's business-specific validation has been exhaustively audited.

Changes activated in the local backend and its bundled frontend. The development frontend receives the source updates through Vite.
