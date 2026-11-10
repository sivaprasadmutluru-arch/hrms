package com.example.demo.documents.service;

import com.example.demo.base.entity.Company;
import com.example.demo.documents.entity.GeneratedLetter;
import com.example.demo.employee.entity.Employee;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class LetterPdfServiceTest {

    private LetterPdfService pdfService;
    private Company company;
    private Employee employee;

    @BeforeEach
    void setUp() {
        pdfService = new LetterPdfService();

        company = new Company();
        company.setName("Acme Global HR Solutions");
        company.setAddress("123 Tech Park, Silicon Valley");
        company.setCity("San Francisco");
        company.setState("California");
        company.setCountry("USA");
        company.setEmail("hr@acmeglobal.com");
        company.setPhone("+1 (555) 019-2834");
        company.setWebsite("www.acmeglobal.com");

        employee = new Employee();
        employee.setBadgeId("EMP-001");
        employee.setFirstName("John");
        employee.setLastName("Doe");
        employee.setEmail("john.doe@acmeglobal.com");
        employee.setGender(Employee.Gender.MALE);
        employee.setDateJoining(LocalDate.of(2022, 1, 15));
    }

    @Test
    void generatesValidOfferLetterPdf() {
        GeneratedLetter letter = new GeneratedLetter();
        letter.setLetterType(GeneratedLetter.LetterType.OFFER_LETTER);
        letter.setReferenceNumber("OL-2026-0001");
        letter.setTitle("Offer Letter - John Doe");
        letter.setIssueDate(LocalDate.now());
        letter.setCompany(company);
        letter.setRecipientName("John Doe");
        letter.setRecipientEmail("john.doe@example.com");
        letter.setRecipientAddress("742 Evergreen Terrace, Springfield");
        letter.setDesignation("Lead Full Stack Architect");
        letter.setDepartment("Engineering");
        letter.setWorkLocation("San Francisco HQ / Hybrid");
        letter.setJoiningDate(LocalDate.now().plusWeeks(2));
        letter.setSalary(BigDecimal.valueOf(165000));
        letter.setCurrency("USD");
        letter.setSalaryFrequency("Per Annum");
        letter.setEmploymentType("Full-Time");
        letter.setProbationPeriod("3 Months");
        letter.setNoticePeriod("60 Days");
        letter.setAcceptanceDeadline(LocalDate.now().plusWeeks(1));
        letter.setSignatoryName("Samantha Vance");
        letter.setSignatoryDesignation("Vice President of Human Resources");

        byte[] pdfBytes = pdfService.generatePdf(letter);
        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(1000);
        // Check PDF header signature '%PDF'
        assertThat(new String(pdfBytes, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    void generatesValidExperienceCertificatePdf() {
        GeneratedLetter letter = new GeneratedLetter();
        letter.setLetterType(GeneratedLetter.LetterType.EXPERIENCE_CERTIFICATE);
        letter.setReferenceNumber("EXP-2026-0001");
        letter.setTitle("Experience Certificate - John Doe");
        letter.setIssueDate(LocalDate.now());
        letter.setCompany(company);
        letter.setEmployee(employee);
        letter.setRecipientName("John Doe");
        letter.setDesignation("Senior Software Engineer");
        letter.setDepartment("Information Technology");
        letter.setJoiningDate(LocalDate.of(2022, 1, 15));
        letter.setRelievingDate(LocalDate.of(2026, 10, 31));
        letter.setConduct("Exemplary");
        letter.setDutiesAndPerformance("During his tenure, John demonstrated exceptional problem solving and technical leadership.");
        letter.setSignatoryName("David Sterling");
        letter.setSignatoryDesignation("Director of Talent Operations");

        byte[] pdfBytes = pdfService.generatePdf(letter);
        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(1000);
        assertThat(new String(pdfBytes, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    void generatesValidRelievingLetterPdf() {
        GeneratedLetter letter = new GeneratedLetter();
        letter.setLetterType(GeneratedLetter.LetterType.RELIEVING_LETTER);
        letter.setReferenceNumber("REL-2026-0001");
        letter.setTitle("Relieving Letter - John Doe");
        letter.setIssueDate(LocalDate.now());
        letter.setCompany(company);
        letter.setEmployee(employee);
        letter.setRecipientName("John Doe");
        letter.setDesignation("Senior Software Engineer");
        letter.setDepartment("Information Technology");
        letter.setJoiningDate(LocalDate.of(2022, 1, 15));
        letter.setResignationDate(LocalDate.of(2026, 9, 30));
        letter.setRelievingDate(LocalDate.of(2026, 10, 31));
        letter.setDuesCleared(true);
        letter.setSignatoryName("David Sterling");
        letter.setSignatoryDesignation("Director of Talent Operations");

        byte[] pdfBytes = pdfService.generatePdf(letter);
        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(1000);
        assertThat(new String(pdfBytes, 0, 4)).isEqualTo("%PDF");
    }
}
