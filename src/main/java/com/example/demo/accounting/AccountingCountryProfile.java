package com.example.demo.accounting;

import java.util.Locale;

/** Country determines available classifications, never an employee's statutory eligibility. */
public record AccountingCountryProfile(String code, String country, String name, String guidance) {
    public static AccountingCountryProfile from(String value) {
        String country = value == null ? "" : value.trim();
        String normalized = country.toLowerCase(Locale.ROOT).replaceAll("[.\\s_-]", "");
        if (java.util.Set.of("india", "in", "ind").contains(normalized))
            return new AccountingCountryProfile("IN", country, "India payroll accounting",
                "PF and TDS use configured deductions or reviewed amounts. Eligibility and rates must be configured; no statutory amounts are inferred.");
        if (java.util.Set.of("unitedarabemirates", "uae", "ae", "are", "dubai").contains(normalized))
            return new AccountingCountryProfile("AE", country, "UAE payroll accounting",
                "No UAE salary income tax is inferred. Pension contributions require employee eligibility review. Manage gratuity or an applicable savings scheme separately; payment references do not constitute WPS submission.");
        if (java.util.Set.of("unitedstates", "unitedstatesofamerica", "us", "usa").contains(normalized))
            return new AccountingCountryProfile("US", country, "US payroll accounting",
                "Record federal, state/local withholding, Social Security, Medicare and eligible retirement contributions. Review employee W-4 elections, work/residence jurisdictions and year-to-date limits. No tax tables, filings or automatic eligibility calculations are provided.");
        if (java.util.Set.of("unitedkingdom", "uk", "gb", "gbr", "greatbritain", "britain").contains(normalized))
            return new AccountingCountryProfile("GB", country, "UK payroll accounting",
                "Record PAYE income tax, employee/employer National Insurance, workplace pension and applicable student/postgraduate loan deductions or Apprenticeship Levy. Review tax code, NI category, loan plan, tax year, pay frequency and year-to-date figures. No HMRC RTI filings or automatic statutory calculations are provided.");
        return new AccountingCountryProfile("GENERAL", country, country.isEmpty() ? "Country not configured" : "General payroll accounting",
            country.isEmpty() ? "Set the organization's head-office country in Company Settings. Country-specific payroll posting is blocked until it is configured."
                : "Use reviewed payroll deductions and employer contributions. Country-specific statutory calculations are not provided for this country.");
    }
    public boolean india() { return code.equals("IN"); }
    public boolean uae() { return code.equals("AE"); }
    public boolean us() { return code.equals("US"); }
    public boolean uk() { return code.equals("GB"); }
    public boolean configured() { return !country.isBlank(); }
}
