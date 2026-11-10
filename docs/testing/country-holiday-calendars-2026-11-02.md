# Organization country and holiday calendars — 2 November 2026

Country is mandatory for new organizations in the form, API validation and direct service path. The dropdown contains 25 common countries, including India and United Arab Emirates (Dubai/UAE). The selected country is trimmed and passed to the head office, the existing source of company-country settings. Existing organizations are not forced to change their stored country. Leave defaults for other named countries use common types; an unset legacy country keeps the earlier combined-catalog behavior.

Organizations choose their holiday calendar in Leave → Holidays → Country calendar. Country is suggested from the company/head office when configured, but no calendar is imported automatically. HR selects country/year, previews holiday names, dates and source links, then chooses which to import. State, local and other-country holidays remain customizable through Add Holiday.

India's 2026 national reference uses the India Post published list. The UAE reference includes fixed-date holidays and 2026 religious-date references. Moon-dependent and potentially shifted/sector-dependent dates require an explicit confirmation checkbox; they are not selected by default. For other years, only fixed-date reference holidays are supplied, with an incomplete-calendar message. Festival dates are never copied to another year. Dates are editable using the existing holiday form after import; differing dates can be deselected and added manually.

Import checks company scope, validates keys against the selected server-side catalog, locks the company to serialize requests, preserves existing names/aliases/customized dates, and tracks catalog keys so re-import cannot overwrite a renamed or rescheduled imported holiday. Only explicitly selected holidays are added. No notifications, employee allocations, historical leave updates or payroll rewrites are triggered. Once imported, company holidays are used by existing working-day calculations.

Apply V41__holiday_catalog_imports.sql before deploying the backend. No actual holiday calendar was imported into the current organization during verification; the user chose to leave selection to each organization.

Validation: frontend build; HolidayCatalogIntegrationTest (10), OrganizationCountryTest (4), DefaultLeaveTypesIntegrationTest (11), all passed. Tests used a disposable PostgreSQL database and covered scope isolation, idempotency, changed dates, explicit variable-date confirmation, future-year limitations, actual working-day exclusions, country validation and persistence. Test database removed after checks.

References:
- https://www.indiapost.gov.in/holidays-list
- https://u.ae/en/information-and-services/public-holidays-and-religious-affairs/public-holidays
- https://www.wam.ae/en/article/byvw3i7-eid-fitr-holiday-announced-for-private-sector
- https://mwodubai.org/announcements-and-notices/mwo-dubai-advisory-no-16-series-of-2026-observance-of-uae-holidays/
- https://sharjah24.ae/en/Articles/2026/06/03/AL011
- https://www.wam.ae/en/article/c1wufxu-prophet-muhammad%E2%80%99s-birthday-holiday-for-ajman
