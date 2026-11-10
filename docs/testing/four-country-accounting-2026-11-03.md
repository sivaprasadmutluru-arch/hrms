# Four-country accounting profiles — 3 November 2026

Organization onboarding and the platform-only Country settings selector now list the four launch targets: India, United States (USA), United Arab Emirates (Dubai / UAE), and United Kingdom (UK). Backend organization creation and country changes reject other launch selections. Existing organizations outside those countries retain the neutral accounting profile and their existing data. Existing wider holiday country options are unchanged.

| Profile | Recorded payroll fields | New head-office currency default |
| --- | --- | --- |
| India | Employee/employer PF, TDS, reviewed other deductions | INR |
| USA | Federal/state/local withholding, employee/employer Social Security and Medicare, retirement contributions | USD |
| UAE | Reviewed pension contributions for eligible staff; existing Gratuity / EOSB workflow | AED |
| UK | PAYE, employee/employer National Insurance, workplace pension, student/postgraduate loans, allocated Apprenticeship Levy | GBP |

Existing currencies, rates and journals are never automatically converted by changing country. New branches inherit their head office's currency. Country changes remain restricted to platform administrators. The current Accrue Technologies organization remains India.

## UK implementation

Migration V46 adds UK deduction classifications and a separate UK payroll-review snapshot. Employee deductions reduce outstanding net salary; employer NI, pensions and allocated levy increase employer cost without being subtracted from employee pay. UK liability and employer expense accounts are separate from Indian PF/TDS and US tax accounts. Invalid country mappings, negative/overstated reviews and employee deductions labelled as Apprenticeship Levy are rejected or flagged for review.

The salary register, deduction mapping options, manual review, source fingerprints, idempotent payroll posting, account visibility and Excel columns follow the country profile. UK summary formulas include employer NI and levy. No statutory rates, tax codes, NI categories, loan thresholds, pension eligibility or salary-sacrifice treatment are inferred.

Staffing authorization records now include UK Skilled Worker, Graduate, Dependant, Global Talent, Settled and Pre-settled categories. Skilled Worker records require a sponsoring employer; temporary categories require validity end dates. Settled status can have no recorded expiry. These are reviewed HR records and reminders, not immigration eligibility determinations or automated employment decisions.

## Verification

67 tests passed: 9 UK integration tests, 31 existing accounting integration tests, 20 staffing integration tests and 7 payroll snapshot parser tests. They cover the four country aliases, UK mapping/withholding, exact net/employer amounts, balanced and duplicate-safe journals, NI liabilities, pension and loan deductions, evaluated Excel summary formulas, launch currency defaults, incompatible country rejection, UK authorization validation and existing country security/workflows. Frontend production build passed.

All test financial and immigration records stayed in a disposable test database. V46 was applied locally; the updated frontend/backend are running.

## Launch boundary

These are country-specific recording and bookkeeping profiles, not complete statutory payroll engines or certification of launch readiness. UK automatic tax calculations, tax-code/NI/loan-plan configuration, HMRC RTI FPS/EPS submissions, P45/P60, pension enrolment/provider integrations and IR35 determinations are not implemented. US filing/W-4/YTD automation, UAE WPS submission and India statutory filings also remain separate integrations. Each launch still needs jurisdiction-specific validation of the configured payroll process.

References consulted:
- https://www.gov.uk/paye-for-employers/paye-and-payroll
- https://www.gov.uk/running-payroll/deductions
- https://www.gov.uk/guidance/special-rules-for-student-loans
