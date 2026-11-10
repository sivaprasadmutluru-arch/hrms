package com.example.demo.documents.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "generated_letters")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class GeneratedLetter extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "letter_type", nullable = false, length = 50)
    private LetterType letterType;

    @Column(name = "reference_number", nullable = false, length = 100)
    private String referenceNumber;

    @Column(name = "title", nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private LetterStatus status = LetterStatus.DRAFT;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "reportingManager"})
    private Employee employee;

    // Recipient Information
    @Column(name = "recipient_name", nullable = false)
    private String recipientName;

    @Column(name = "recipient_email")
    private String recipientEmail;

    @Column(name = "recipient_phone")
    private String recipientPhone;

    @Column(name = "recipient_address", columnDefinition = "TEXT")
    private String recipientAddress;

    @Column(name = "designation")
    private String designation;

    @Column(name = "department")
    private String department;

    @Column(name = "work_location")
    private String workLocation;

    // Key Dates
    @Column(name = "joining_date")
    private LocalDate joiningDate;

    @Column(name = "relieving_date")
    private LocalDate relievingDate;

    @Column(name = "resignation_date")
    private LocalDate resignationDate;

    // Offer Letter specific fields
    @Column(name = "salary", precision = 15, scale = 2)
    private BigDecimal salary;

    @Column(name = "currency", length = 10)
    private String currency = "USD";

    @Column(name = "salary_frequency", length = 30)
    private String salaryFrequency = "Per Annum";

    @Column(name = "employment_type", length = 50)
    private String employmentType = "Full-Time";

    @Column(name = "probation_period", length = 50)
    private String probationPeriod = "3 Months";

    @Column(name = "notice_period", length = 50)
    private String noticePeriod = "30 Days";

    @Column(name = "acceptance_deadline")
    private LocalDate acceptanceDeadline;

    // Authorized Signatory
    @Column(name = "signatory_name")
    private String signatoryName;

    @Column(name = "signatory_designation")
    private String signatoryDesignation;

    // Experience / Relieving specific fields
    @Column(name = "conduct", length = 50)
    private String conduct = "Excellent";

    @Column(name = "duties_and_performance", columnDefinition = "TEXT")
    private String dutiesAndPerformance;

    @Column(name = "dues_cleared")
    private Boolean duesCleared = true;

    // Custom clauses or notes
    @Column(name = "custom_terms", columnDefinition = "TEXT")
    private String customTerms;

    // Email dispatch tracking
    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "sent_to_email")
    private String sentToEmail;

    public enum LetterType {
        OFFER_LETTER,
        EXPERIENCE_CERTIFICATE,
        RELIEVING_LETTER
    }

    public enum LetterStatus {
        DRAFT,
        ISSUED,
        SENT
    }
}
