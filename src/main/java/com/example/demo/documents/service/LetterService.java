package com.example.demo.documents.service;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.service.EmailService;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.documents.entity.GeneratedLetter;
import com.example.demo.documents.repository.GeneratedLetterRepository;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class LetterService {

    private final GeneratedLetterRepository letterRepository;
    private final LetterPdfService letterPdfService;
    private final EmailService emailService;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public List<GeneratedLetter> listLetters(GeneratedLetter.LetterType type, String search) {
        Specification<GeneratedLetter> spec = ScopeFilter.byCompany();

        if (type != null) {
            Specification<GeneratedLetter> typeSpec = (root, query, cb) -> cb.equal(root.get("letterType"), type);
            spec = spec != null ? spec.and(typeSpec) : typeSpec;
        }

        if (search != null && !search.trim().isBlank()) {
            String term = "%" + search.trim().toLowerCase() + "%";
            Specification<GeneratedLetter> searchSpec = (root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("recipientName")), term),
                    cb.like(cb.lower(root.get("recipientEmail")), term),
                    cb.like(cb.lower(root.get("referenceNumber")), term),
                    cb.like(cb.lower(root.get("title")), term),
                    cb.like(cb.lower(root.get("designation")), term)
            );
            spec = spec != null ? spec.and(searchSpec) : searchSpec;
        }

        return spec != null ? letterRepository.findAll(spec) : letterRepository.findAll();
    }

    @Transactional(readOnly = true)
    public GeneratedLetter getById(Long id) {
        return letterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GeneratedLetter", id));
    }

    public GeneratedLetter createLetter(GeneratedLetter letter) {
        // Resolve Company
        if (letter.getCompany() != null && letter.getCompany().getId() != null) {
            letter.setCompany(companyRepository.findById(letter.getCompany().getId())
                    .orElse(letter.getCompany()));
        } else {
            AccessScopeContext.ScopeData scope = AccessScopeContext.get();
            Long companyId = scope != null ? scope.getCompanyId() : null;
            if (companyId != null) {
                companyRepository.findById(companyId).ifPresent(letter::setCompany);
            }
        }

        // Resolve Employee if present
        if (letter.getEmployee() != null && letter.getEmployee().getId() != null) {
            Employee emp = employeeRepository.findById(letter.getEmployee().getId()).orElse(null);
            if (emp != null) {
                letter.setEmployee(emp);
                if (letter.getRecipientName() == null || letter.getRecipientName().isBlank()) {
                    letter.setRecipientName(emp.getFirstName() + " " + (emp.getLastName() != null ? emp.getLastName() : ""));
                }
                if (letter.getRecipientEmail() == null || letter.getRecipientEmail().isBlank()) {
                    letter.setRecipientEmail(emp.getEmail() != null ? emp.getEmail() : emp.getWorkEmail());
                }
                if (letter.getRecipientPhone() == null || letter.getRecipientPhone().isBlank()) {
                    letter.setRecipientPhone(emp.getPhone() != null ? emp.getPhone() : emp.getWorkPhone());
                }
                if (letter.getDesignation() == null || letter.getDesignation().isBlank()) {
                    letter.setDesignation(emp.getJobPosition() != null ? emp.getJobPosition().getName() : null);
                }
                if (letter.getDepartment() == null || letter.getDepartment().isBlank()) {
                    letter.setDepartment(emp.getDepartment() != null ? emp.getDepartment().getName() : null);
                }
                if (letter.getJoiningDate() == null) {
                    letter.setJoiningDate(emp.getDateJoining());
                }
            }
        }

        // Default issue date
        if (letter.getIssueDate() == null) {
            letter.setIssueDate(LocalDate.now());
        }

        // Auto-generate reference number if absent
        if (letter.getReferenceNumber() == null || letter.getReferenceNumber().trim().isBlank()) {
            letter.setReferenceNumber(generateReferenceNumber(letter.getCompany(), letter.getLetterType()));
        }

        // Default title if absent
        if (letter.getTitle() == null || letter.getTitle().trim().isBlank()) {
            letter.setTitle(defaultTitle(letter));
        }

        if (letter.getStatus() == null) {
            letter.setStatus(GeneratedLetter.LetterStatus.DRAFT);
        }

        return letterRepository.save(letter);
    }

    public GeneratedLetter updateLetter(Long id, GeneratedLetter updated) {
        GeneratedLetter letter = getById(id);

        letter.setTitle(updated.getTitle() != null ? updated.getTitle() : letter.getTitle());
        letter.setStatus(updated.getStatus() != null ? updated.getStatus() : letter.getStatus());
        letter.setIssueDate(updated.getIssueDate() != null ? updated.getIssueDate() : letter.getIssueDate());
        letter.setRecipientName(updated.getRecipientName() != null ? updated.getRecipientName() : letter.getRecipientName());
        letter.setRecipientEmail(updated.getRecipientEmail());
        letter.setRecipientPhone(updated.getRecipientPhone());
        letter.setRecipientAddress(updated.getRecipientAddress());
        letter.setDesignation(updated.getDesignation());
        letter.setDepartment(updated.getDepartment());
        letter.setWorkLocation(updated.getWorkLocation());
        letter.setJoiningDate(updated.getJoiningDate());
        letter.setRelievingDate(updated.getRelievingDate());
        letter.setResignationDate(updated.getResignationDate());
        letter.setSalary(updated.getSalary());
        letter.setCurrency(updated.getCurrency());
        letter.setSalaryFrequency(updated.getSalaryFrequency());
        letter.setEmploymentType(updated.getEmploymentType());
        letter.setProbationPeriod(updated.getProbationPeriod());
        letter.setNoticePeriod(updated.getNoticePeriod());
        letter.setAcceptanceDeadline(updated.getAcceptanceDeadline());
        letter.setSignatoryName(updated.getSignatoryName());
        letter.setSignatoryDesignation(updated.getSignatoryDesignation());
        letter.setConduct(updated.getConduct());
        letter.setDutiesAndPerformance(updated.getDutiesAndPerformance());
        letter.setDuesCleared(updated.getDuesCleared());
        letter.setCustomTerms(updated.getCustomTerms());

        if (updated.getEmployee() != null && updated.getEmployee().getId() != null) {
            employeeRepository.findById(updated.getEmployee().getId()).ifPresent(letter::setEmployee);
        }

        return letterRepository.save(letter);
    }

    public void deleteLetter(Long id) {
        letterRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public byte[] generatePdf(Long id) {
        GeneratedLetter letter = getById(id);
        return letterPdfService.generatePdf(letter);
    }

    public boolean sendEmail(Long id, String customTo, String customSubject, String customMessage) {
        GeneratedLetter letter = getById(id);
        byte[] pdfBytes = letterPdfService.generatePdf(letter);

        String to = (customTo != null && !customTo.isBlank()) ? customTo.trim() : letter.getRecipientEmail();
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("Recipient email address is required to send document");
        }

        String companyName = (letter.getCompany() != null && letter.getCompany().getName() != null)
                ? letter.getCompany().getName() : "AccrueHR Enterprise";

        String typeLabel = switch (letter.getLetterType()) {
            case OFFER_LETTER -> "Job Offer Letter";
            case EXPERIENCE_CERTIFICATE -> "Experience Certificate";
            case RELIEVING_LETTER -> "Relieving Letter";
        };

        String subject = (customSubject != null && !customSubject.isBlank())
                ? customSubject
                : String.format("%s - %s (Ref: %s)", typeLabel, companyName, letter.getReferenceNumber());

        String safeRef = letter.getReferenceNumber().replaceAll("[^a-zA-Z0-9.-]", "_");
        String filename = String.format("%s_%s.pdf", letter.getLetterType().name(), safeRef);

        String signatory = letter.getSignatoryName() != null ? letter.getSignatoryName() : "HR Department";
        String signatoryTitle = letter.getSignatoryDesignation() != null ? letter.getSignatoryDesignation() : "Human Resources";

        StringBuilder bodyHtml = new StringBuilder();
        bodyHtml.append("<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; padding: 16px;\">");
        bodyHtml.append("<p style=\"font-size: 15px;\">Dear <strong>").append(escapeHtml(letter.getRecipientName())).append("</strong>,</p>");

        if (customMessage != null && !customMessage.isBlank()) {
            bodyHtml.append("<p style=\"font-size: 14px;\">").append(escapeHtml(customMessage).replace("\n", "<br/>")).append("</p>");
        } else {
            bodyHtml.append("<p style=\"font-size: 14px;\">Please find attached your official <strong>").append(typeLabel).append("</strong> (Reference: <code style=\"background: #f1f5f9; padding: 2px 6px; border-radius: 4px;\">")
                    .append(escapeHtml(letter.getReferenceNumber())).append("</code>) issued by <strong>").append(escapeHtml(companyName)).append("</strong>.</p>");
            if (letter.getLetterType() == GeneratedLetter.LetterType.OFFER_LETTER) {
                bodyHtml.append("<p style=\"font-size: 14px;\">We are very pleased to extend this offer and look forward to having you join our team. Please review the attached document and return a signed copy by the acceptance deadline.</p>");
            } else if (letter.getLetterType() == GeneratedLetter.LetterType.EXPERIENCE_CERTIFICATE) {
                bodyHtml.append("<p style=\"font-size: 14px;\">We appreciate your dedicated service and valuable contributions to the company, and we wish you continued success in your future endeavors.</p>");
            } else {
                bodyHtml.append("<p style=\"font-size: 14px;\">This document serves as your official confirmation of relieving and settlement of service. We thank you for your contributions and wish you all the best.</p>");
            }
        }

        bodyHtml.append("<p style=\"font-size: 14px;\">The signed document is attached in PDF format for your official records.</p>");
        bodyHtml.append("<br/><p style=\"font-size: 14px; color: #475569;\">Warm regards,<br/><strong>").append(escapeHtml(signatory)).append("</strong><br/>")
                .append(escapeHtml(signatoryTitle)).append("<br/>")
                .append("<strong>").append(escapeHtml(companyName)).append("</strong></p></div>");

        Long companyId = letter.getCompany() != null ? letter.getCompany().getId() : null;
        boolean sent = emailService.sendEmailWithAttachment(companyId, to, subject, bodyHtml.toString(),
                letter.getEmployee(), filename, pdfBytes, "application/pdf");

        if (sent) {
            letter.setStatus(GeneratedLetter.LetterStatus.SENT);
            letter.setSentAt(LocalDateTime.now());
            letter.setSentToEmail(to);
            letterRepository.save(letter);
        }
        return sent;
    }

    @Transactional(readOnly = true)
    public List<GeneratedLetter> listForEmployee(Long employeeId) {
        Employee emp = employeeRepository.findById(employeeId).orElse(null);
        String email = emp != null ? (emp.getEmail() != null ? emp.getEmail() : emp.getWorkEmail()) : "";
        return letterRepository.findByEmployeeIdOrEmail(employeeId, email);
    }

    private String generateReferenceNumber(Company company, GeneratedLetter.LetterType type) {
        int year = LocalDate.now().getYear();
        String prefix = switch (type) {
            case OFFER_LETTER -> "OL";
            case EXPERIENCE_CERTIFICATE -> "EXP";
            case RELIEVING_LETTER -> "REL";
        };
        Long companyId = company != null ? company.getId() : 1L;
        long count = letterRepository.countByCompanyIdAndLetterType(companyId, type) + 1;
        String ref = String.format("%s-%d-%04d", prefix, year, count);
        while (letterRepository.existsByReferenceNumber(ref)) {
            count++;
            ref = String.format("%s-%d-%04d", prefix, year, count);
        }
        return ref;
    }

    private String defaultTitle(GeneratedLetter letter) {
        String typeLabel = switch (letter.getLetterType()) {
            case OFFER_LETTER -> "Offer Letter";
            case EXPERIENCE_CERTIFICATE -> "Experience Certificate";
            case RELIEVING_LETTER -> "Relieving Letter";
        };
        return typeLabel + " - " + (letter.getRecipientName() != null ? letter.getRecipientName() : "Employee");
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
