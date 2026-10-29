# Automatic probation confirmation

## Deployment prerequisite

Apply `src/main/resources/db/migration/V22__probation_confirmation.sql` to the production database **before** installing this build. Production validates the Hibernate schema before application runners start. Back up the database and current JAR first. The migration creates two new empty tables in each existing employee schema; it changes no employee, leave balance, or leave request.

New tenant schemas are provisioned from the entity metadata automatically.

## Enable for a company

Select a company, open Onboarding > Probation, enable automatic confirmation, choose the earliest employee joining date covered by the policy, and save. The policy is disabled until explicitly configured. Earlier joiners keep their existing leave policies and balances.

The effective joining date cannot change after confirmations have been recorded. This prevents reinterpretation of historical entitlements. Disabling the policy stops new automatic confirmations; confirmed employees retain their original accrual start date.

## Behaviour

- The confirmation date is joining date plus six calendar months, including month-end/leap-year adjustment.
- The job runs hourly and on application startup; missed runs are caught up. Inactive employees and companies are skipped. Employees without joining dates are shown for HR correction.
- Confirmation status and initial upfront allocation commit together, with an employee row lock and unique confirmation constraint preventing repeated confirmation.
- Only active company policies, applicable organization-wide policies from the parent, and matching employee categories are allocated. Category-specific policies require the employee's configured work-information category.
- Existing balances and allocations are never reset by confirmation.
- Monthly policies open at zero and accrue only after recorded confirmation, with the first partial month prorated. Posting timing, precision, monthly rate, accrual start date, and calendar/working-day basis remain controlled by the leave type. Accrual logs prevent duplicate monthly credits. Catch-up does not credit expired leave years into current balances.
- Upfront policies use total annual entitlement or confirmation-to-period-end proration, according to the leave type's "Entitlement on probation confirmation" selection.

## Checks

Run the probation confirmation, eligibility, accrual, scheduler and access tests. Also run the existing leave scheduler tests and build the website. Do not enable a cohort retroactively without reviewing previously imported/credited entitlements; the system deliberately preserves those amounts.
