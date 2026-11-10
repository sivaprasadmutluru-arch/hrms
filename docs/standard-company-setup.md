# Organization industry templates

Organization registration includes an industry selector. The master catalog maintains 17 choices: Software & IT, Medical & healthcare, Education, Manufacturing, Retail, Hospitality, Construction, Professional services, Banking/finance/insurance, Logistics/transport/warehousing, Media/advertising, Nonprofit/social services, Government/public sector, Agriculture/food production, Real estate/property management, Energy/utilities, and Other/general business.

Each template combines common business departments with industry-specific departments and positions. For example, software includes Engineering and Software Engineer; medical includes Clinical Services, Nursing, Pharmacy, Laboratory, Radiology and Patient Services. Organizations can add custom entries through Departments and Job positions.

New organization defaults use the selected industry during durable workspace provisioning. Branches inherit their organization's industry. Existing workspaces preserve the previously applied software template until an administrator changes it.

Under Setup → Job positions, an explicitly assigned organization administrator can preview another template and apply it to the head office and its branches. Previous template rows and employee assignments remain in storage. Setup lists and employee selection show only the selected industry's defaults and customized entries. Switching back reuses the prior catalog instead of duplicating or recreating entries an organization removed. Custom positions keep their department selectable even if it originally belonged to another template.

Tracking tables distinguish default entries from custom/renamed records. Initialization is independent of development demo seeding and never creates users, employees or access grants. CEO/COO access remains an explicit, separate configuration.

Deployment: apply V28__standard_company_setup.sql and V29__organization_industry_templates.sql before deploying. V29 preserves existing workspaces as SOFTWARE and new organizations default to GENERAL. The source catalog is StandardCompanySetup; company_setup_items and company_setup_templates track the default entries applied to each company.

Industry grouping is a product choice rather than a universal HRMS standard. Comparison sources consulted: https://www.zoho.com/people/industries/ and https://www.adp.com/who-we-serve/by-industry.aspx . Their public pages describe industry solutions, not necessarily their registration forms or automatic department templates.
