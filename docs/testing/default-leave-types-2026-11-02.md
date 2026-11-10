# India and Dubai/UAE default leave types — 2 November 2026

Added common templates: Annual Leave (recognizes Earned/Privilege aliases), Sick Leave, Maternity Leave, Bereavement Leave (recognizes Compassionate aliases), Compensatory Off and Loss of Pay. India adds Casual and Paternity. Dubai/UAE adds Parental, Study, Hajj and National Service.

New company setup seeds the catalog according to company country; branches inherit the head-office country if unset. India/IN and UAE/AE/Dubai names are recognized. An unset legacy country receives both catalogs; other named countries receive only common leave types, and an administrator can add either regional catalog from Leave Types. Existing workspaces receive defaults on startup. Setup is serialized with a company-row lock and marked once per catalog group in the existing company_setup_templates table. No new schema migration.

Existing named/aliased policies are preserved, including inactive ones. Organization-wide policies in the same organization are recognized so branches do not duplicate inherited types. Markers preserve deliberate deletions/renames on future runs. Custom types remain available; regional expansion adds missing types and never deletes another region's data.

New types start with 0 entitlement days, manual allocation, no automatic accrual, no negative balances and HR approval. No employee balances or historical leave records are created or modified. Payment, weekend, carry-forward and eligibility settings are starter values to review for the organization's actual policy, rather than an automatic statutory calculation. Sick templates require attachments. Hajj and Loss of Pay start unpaid.

Source references for category names, without importing statutory day counts:
- UAE government: https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/types-of-leaves-and-entitlements-in-the-private-sector
- Dubai government: https://www.dubai.ae/web/dubai.ae/living/jobs-employment/leaves
- India Ministry of Labour notification: https://labour.gov.in/sites/default/files/224080_compressed.pdf

Validation: frontend production build; DefaultLeaveTypesIntegrationTest covers country variants, India/UAE catalogs, no auto-entitlements, idempotency, aliases/custom settings, deletions/inactive policies, regional expansion, inherited policies, scope isolation and schema/region validation. Existing StandardCompanySetupIntegrationTest and OrganizationIndustrySetupIntegrationTest also verified against a disposable PostgreSQL database with V27–V29 migrations and COMPANY_ADMIN role fixture. Database is removed after verification.

Completed validation: all 25 related tests passed (10 defaults, 6 standard-company setup, 9 industry setup); build passed. Backend restarted and initialized 12 leave types for company 337 (country unset, both catalogs). Browser confirmed the 12 types and regional selector. Reapplying defaults from the page completed without duplicating rows. Screenshot: /private/tmp/accruehr-default-leave-types.jpg. Disposable test database dropped.
