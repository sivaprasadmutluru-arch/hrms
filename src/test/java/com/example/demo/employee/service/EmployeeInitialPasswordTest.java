package com.example.demo.employee.service;

import com.example.demo.common.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class EmployeeInitialPasswordTest {
    @Test void removesUaeCountryCodeAndFormatting() {
        assertEquals("501234567", EmployeeInitialPassword.resolve(null, "+971 (50) 123-4567", "United Arab Emirates"));
        assertEquals("501234567", EmployeeInitialPassword.resolve(null, "971501234567", "AE"));
        assertEquals("501234567", EmployeeInitialPassword.resolve(null, "00971 50 123 4567", "UAE"));
        assertEquals("501234567", EmployeeInitialPassword.resolve(null, "971501234567", null));
    }
    @Test void handlesOtherCountriesWithoutHardCodedPrefixTrimming() {
        assertEquals("9876543210", EmployeeInitialPassword.resolve(null, "+91 98765-43210", "India"));
        assertEquals("2025550123", EmployeeInitialPassword.resolve(null, "+1 (202) 555-0123", "US"));
        assertEquals("7700900123", EmployeeInitialPassword.resolve(null, "+44 7700 900123", "United Kingdom"));
    }
    @Test void keepsDigitsOfAlreadyLocalNumbersIncludingLeadingZero() {
        assertEquals("0501234567", EmployeeInitialPassword.resolve(null, "050 123-4567", "AE"));
        assertEquals("501234567", EmployeeInitialPassword.resolve(null, "50 123 4567", null));
    }
    @Test void preservesExplicitPasswords() {
        assertEquals("Chosen@Pass123", EmployeeInitialPassword.resolve("Chosen@Pass123", "+971501234567", "AE"));
    }
    @Test void missingOrMalformedPhoneNeedsExplicitPasswordInsteadOfSharedFallback() {
        assertThrows(BadRequestException.class, () -> EmployeeInitialPassword.resolve(null, null, "AE"));
        assertThrows(BadRequestException.class, () -> EmployeeInitialPassword.resolve(null, "---", "AE"));
        assertThrows(BadRequestException.class, () -> EmployeeInitialPassword.resolve(null, "+123", "AE"));
    }
}
