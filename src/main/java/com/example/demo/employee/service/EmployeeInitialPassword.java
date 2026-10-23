package com.example.demo.employee.service;

import com.example.demo.common.exception.BadRequestException;
import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber.PhoneNumber.CountryCodeSource;
import java.util.Locale;

/** Derives new-account passwords without modifying contact numbers or existing credentials. */
final class EmployeeInitialPassword {
    private static final PhoneNumberUtil PHONES = PhoneNumberUtil.getInstance();
    private EmployeeInitialPassword() {}

    static String resolve(String explicitPassword, String phone, String country) {
        if (explicitPassword != null && !explicitPassword.isBlank()) return explicitPassword;
        if (phone == null || phone.isBlank()) {
            throw new BadRequestException("Provide a phone number or an explicit initial password to create the employee login.");
        }
        String raw = phone.trim();
        String digits = raw.replaceAll("[^0-9]", "");
        String region = region(country);
        boolean international = raw.startsWith("+") || raw.startsWith("00");
        String input = raw.startsWith("00") ? "+" + raw.substring(2) : raw;
        if (region == null && !international && digits.length() <= 10) return checked(digits);
        // With no region, long numbers need an explicit international interpretation.
        if (region == null && !international) input = "+" + digits;
        try {
            var parsed = PHONES.parseAndKeepRawInput(input, region);
            if (!PHONES.isPossibleNumber(parsed) || parsed.hasExtension()) throw invalid();
            String national = parsed.getCountryCodeSource() == CountryCodeSource.FROM_DEFAULT_COUNTRY
                    ? digits : PHONES.getNationalSignificantNumber(parsed);
            return checked(national);
        } catch (NumberParseException ex) {
            throw invalid();
        }
    }

    private static String checked(String digits) {
        if (!digits.matches("[0-9]{6,15}")) throw invalid();
        return digits;
    }

    private static BadRequestException invalid() {
        return new BadRequestException("Unable to derive the initial password. Provide a valid phone number with its country code, or an explicit initial password.");
    }

    private static String region(String country) {
        if (country == null || country.isBlank()) return null;
        String value = country.trim();
        if (value.equalsIgnoreCase("UAE") || value.equalsIgnoreCase("U.A.E.") || value.equalsIgnoreCase("United Arab Emirates (UAE)")) return "AE";
        if (value.equalsIgnoreCase("UK")) return "GB";
        for (String code : Locale.getISOCountries()) {
            Locale locale = Locale.of("", code);
            if (code.equalsIgnoreCase(value) || locale.getDisplayCountry(Locale.ENGLISH).equalsIgnoreCase(value)
                    || locale.getISO3Country().equalsIgnoreCase(value)) return code;
        }
        return null;
    }
}
