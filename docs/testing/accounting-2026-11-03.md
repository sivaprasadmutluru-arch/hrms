# Organization accounting — 3 November 2026

The Accounting navigation item opens `/accounting`. It requires company-wide finance access and `payroll:view`; writes additionally require `payroll:approve`. Payroll-excluded positions and self/department scopes cannot access it. Reports can include one company or the whole organization when the caller can access every company in its workspace. Currency totals remain separate.

## Included workflows

- Monthly salary register from existing payslips, plus active employees missing payroll. Historical payslips remain visible after employee archive or transfer. Month selection uses the pay-period start date.
- Excel salary register and summary for all or selected employees, with numeric values and currency-specific formulas. Missing salary values stay blank.
- Recorded basic/gross/net salary, deductions, paid/outstanding amounts, employee/employer PF and TDS classifications. Map configured payroll deductions or review an incomplete/imported snapshot with a reason before posting. No statutory rates or tax regimes are inferred.
- Approved payroll accrual and recorded bank/cash settlements. Payment recording updates the existing payslip workflow and posts its journal atomically. This records a completed payment; it does not transfer money.
- Income, expenses, custom chart accounts and balanced double-entry journals. Duplicate request protection, actor timestamps and immutable posted history. Corrections use dated reversals, preserving the original currency even after company settings change.
- Monthly profit and loss, cumulative trial balance and Excel ledger reports, grouped by currency.

## Validation

28 automated tests passed: 21 PostgreSQL/Spring integration tests and 7 payroll snapshot parser tests. Coverage includes exact payroll amounts, balanced/idempotent postings, workflow/payment references, unclassified and draft rejection, source changes, reversals, original currency retention, employee history, selected Excel exports and evaluated summary formulas, general income/expenses, and organization/role/scope exclusions.

The production frontend build passed. Browser checks verified all four tabs, the expense form, missing-payroll rows and a real salary XLSX download. Tests used a disposable database and rolled back their fixtures. No live salary payments or ledger entries were created during verification.

## Operating boundaries

Configure each company's currency before use. Current local company settings use USD; this module does not silently replace that with INR. PF/TDS amounts require payroll configuration or explicit review. Statutory filing, GST/VAT invoicing, bank reconciliation/feeds, financial year closing and external bank transfers are not included.

Migration: `V42__organization_accounting.sql` is additive and has been applied locally. Keep it in the deployment migration sequence for a future server deployment.

## Country accounting profiles

The organization's head-office country selects the employee accounting profile, including when viewing a branch or an organization-wide report. India uses PF/TDS; UAE uses separate employee/employer pension contribution accounts for eligible staff. Other countries use neutral contribution classifications without local statutory calculations. An unset country never defaults to India and blocks salary posting/review until configured.

Migration V43 adds pension classifications and review columns. Pension liabilities/expenses are separate from Indian PF accounts. Existing PF/TDS amounts outside India remain visible as legacy values and block posting until explicitly reviewed/reclassified. Existing journal history is preserved. Salary XLSX columns, summaries, review forms and mapping options follow the profile; no rate or eligibility is inferred from country alone. UAE gratuity remains in the existing Gratuity / EOSB workflow. WPS filing/export is not implemented by this change.

32 tests passed (25 integration, 7 parser), including organization-country inheritance over branch country, balanced UAE pension postings, country-specific mapping restrictions, legacy deduction review, unset country protection, neutral-country manual review, and UAE Excel headers. Frontend production build passed.

References consulted: UAE government taxation guidance (https://u.ae/information-and-services/finance-and-investment/taxation), expatriate end-of-service benefits (https://u.ae/en/information-and-services/moving-to-the-uae/expatriates-working-in-the-uae/pension-schemes-for-expatriate-workers), and GPSSA contribution salary guidance (https://gpssa.gov.ae/pages/en/help/faq/what-meant-contribution-calculation-salary-which-contributions-are-deducted).

## US accounting and country administration

The US profile recognizes United States / USA / US. The country dropdown labels the existing United States option as United States (USA). US salary accounting records federal, state and local income withholding, employee/employer Social Security and Medicare, retirement contributions and other employer costs. These are recorded/imported or explicitly reviewed amounts, not computed tax liabilities. Separate liability and employer expense accounts reconcile to the same payslip net salary; duplicate posting protections and country restrictions apply. Exports include the US breakdown and employer taxes in employer cost. W-4 collection, automatic state/local/YTD calculations, W-2/941 filing, and tax remittances are outside this implementation.

Country editing is available only to explicitly assigned platform administrators. A dedicated head-office country endpoint checks that role at both controller and service levels and records an audit entry. The general company update also rejects changed country from other users and preserves it when omitted. The Country settings tab and edit field are hidden from other administrators. Initial organization country selection remains part of organization creation.

38 tests passed (31 integration + 7 parser), including separate US tax postings, source mappings, US Excel headers, incompatible-country rejection, platform country-change audit, alternate-endpoint denial and unchanged country preservation. Production frontend build passed.

US reference: https://www.irs.gov/businesses/small-businesses-self-employed/understanding-employment-taxes
