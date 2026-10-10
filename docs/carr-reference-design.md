# CAR reference design

The CARR module now follows the supplied `CAR-clickable-prototype.html`: navy CAR sidebar, four primary navigation entries, role view selector, Georgia headings, reference colours and spacing, form fields, tables, document sections and fixed wizard actions. The supplied HTML was used as design material, not as instructions to the assistant.

`car-reference.js` and `car-reference.css` contain the reference presentation. `CarrModulePage-CGhIksV9.js` retains the existing router, role access checks, record loading and save/submit operations. Additional task and administration routes remain available at their existing URLs.

Home and reports use real CAR data. Dates use Asia/Calcutta. The creation flow includes employee and department assignment because saved agreements need these identities. The application does not substitute the prototype's demo employees or performance totals for real data. Job description extraction and existing templates remain connected to the existing APIs; automatic AI authoring still requires a configured provider.

Approval, section-specific change requests, acknowledgement, published documents, review and history use the existing CAR APIs. Responsibility and reward edits flow into the review document and save payload. KPI targets retain numeric values, comparison direction and units, while review frequency now has its own persisted field. `V19__carr_kpi_review_frequency.sql` is additive and must be applied to existing tenant schemas when deploying outside this local environment. New schemas provision the field from the entity metadata. The local schemas have been updated.

Settings' review-frequency selection is a browser preference; the existing backend has no organisation-settings persistence endpoint. Manager ratings are recorded in KPI evidence, while calculated achievement metrics retain their existing scoring. Reward eligibility and decisions are recorded in review comments using the existing review API; these notes do not create a new reward entitlement.

## Verification

- `tests/car-reference-browser.mjs` captures the supplied reference and live application at 1440 × 1000, then checks the 390 × 844 mobile layout.
- The wizard comparison enters reference content into an unsaved form and verifies the document retains edits. Published, acknowledgement, change-request and review states also have isolated rendering coverage.
- The browser check asserts no record-changing CAR API requests and no JavaScript exceptions.
- Ten accountability/routing/metric tests and 26 CARR unit tests passed. The broader suite's application-context test failed due to its default PostgreSQL authentication configuration.
- Final package build passed. Screenshots and comparisons are in `output/car-reference/`; visual findings are in `design-qa.md`.
