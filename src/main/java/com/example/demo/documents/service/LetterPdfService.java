package com.example.demo.documents.service;

import com.example.demo.base.entity.Company;
import com.example.demo.documents.entity.GeneratedLetter;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Slf4j
@Service
public class LetterPdfService {

    private static final Color PRIMARY_DARK   = new Color(30, 41, 59);   // Slate 800
    private static final Color PRIMARY_INDIGO = new Color(49, 46, 129);  // Deep Indigo
    private static final Color ACCENT_INDIGO  = new Color(79, 70, 229);  // Brand Indigo
    private static final Color TEXT_DARK      = new Color(15, 23, 42);   // Slate 900
    private static final Color TEXT_MUTED     = new Color(100, 116, 139);// Slate 500
    private static final Color BG_LIGHT       = new Color(248, 250, 252);// Slate 50
    private static final Color BG_HEADER      = new Color(241, 245, 249);// Slate 100
    private static final Color BORDER_COLOR   = new Color(226, 232, 240);// Slate 200

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.ENGLISH);

    public byte[] generatePdf(GeneratedLetter letter) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 38, 38, 38, 38);
            PdfWriter writer = PdfWriter.getInstance(doc, baos);
            doc.open();

            // 1. Company Letterhead Header
            addCompanyHeader(doc, letter);

            // 2. Reference & Date Bar
            addReferenceDateBar(doc, letter);

            // 3. Document Title Banner
            addTitleBanner(doc, letter);

            // 4. Specific Document Content
            switch (letter.getLetterType()) {
                case OFFER_LETTER -> renderOfferLetterContent(doc, letter);
                case EXPERIENCE_CERTIFICATE -> renderExperienceCertificateContent(doc, letter);
                case RELIEVING_LETTER -> renderRelievingLetterContent(doc, letter);
            }

            // 5. Signature Section
            addSignatureBlock(doc, letter);

            // 6. Footer Notice
            addFooterNotice(doc, letter);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF for letter {}: {}", letter.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to generate letter PDF: " + e.getMessage(), e);
        }
    }

    private void addCompanyHeader(Document doc, GeneratedLetter letter) throws Exception {
        Company company = letter.getCompany();
        String companyName = company != null && company.getName() != null ? company.getName() : "AccrueHR Enterprise";

        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{60f, 40f});
        headerTable.setSpacingAfter(10);

        // Left Cell: Logo or Company Name
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.setPadding(0);

        boolean logoRendered = false;
        if (company != null && company.getLogoPath() != null) {
            try {
                Path lp = Paths.get(company.getLogoPath());
                if (Files.exists(lp) && isPdfLogoSupported(lp.toString())) {
                    Image logo = Image.getInstance(lp.toAbsolutePath().toString());
                    logo.scaleToFit(140, 50);
                    leftCell.addElement(logo);
                    logoRendered = true;
                }
            } catch (Exception ex) {
                log.warn("Could not load company logo from {}: {}", company.getLogoPath(), ex.getMessage());
            }
        }

        if (!logoRendered) {
            Font brandFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, PRIMARY_INDIGO);
            Paragraph brandP = new Paragraph(companyName.toUpperCase(), brandFont);
            brandP.setSpacingAfter(2);
            leftCell.addElement(brandP);

            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 8, TEXT_MUTED);
            leftCell.addElement(new Paragraph("HUMAN RESOURCES DEPARTMENT", subFont));
        }
        headerTable.addCell(leftCell);

        // Right Cell: Company Address & Contact Info (Right aligned)
        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setPadding(0);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        Font compNameFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, PRIMARY_DARK);
        Font infoFont = FontFactory.getFont(FontFactory.HELVETICA, 8, TEXT_MUTED);

        if (logoRendered) {
            Paragraph cp = new Paragraph(companyName, compNameFont);
            cp.setAlignment(Element.ALIGN_RIGHT);
            rightCell.addElement(cp);
        }

        StringBuilder addr = new StringBuilder();
        if (company != null) {
            if (company.getAddress() != null && !company.getAddress().isBlank()) addr.append(company.getAddress()).append("\n");
            StringBuilder cityState = new StringBuilder();
            if (company.getCity() != null) cityState.append(company.getCity());
            if (company.getState() != null) {
                if (!cityState.isEmpty()) cityState.append(", ");
                cityState.append(company.getState());
            }
            if (company.getCountry() != null) {
                if (!cityState.isEmpty()) cityState.append(", ");
                cityState.append(company.getCountry());
            }
            if (!cityState.isEmpty()) addr.append(cityState).append("\n");

            if (company.getEmail() != null && !company.getEmail().isBlank()) addr.append("Email: ").append(company.getEmail()).append("\n");
            if (company.getPhone() != null && !company.getPhone().isBlank()) addr.append("Tel: ").append(company.getPhone()).append("\n");
            if (company.getWebsite() != null && !company.getWebsite().isBlank()) addr.append("Web: ").append(company.getWebsite());
        }

        if (addr.isEmpty()) {
            addr.append("Corporate Headquarters\nHuman Resources Division");
        }

        Paragraph infoP = new Paragraph(addr.toString(), infoFont);
        infoP.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(infoP);

        headerTable.addCell(rightCell);
        doc.add(headerTable);

        // Divider Line
        PdfPTable lineTable = new PdfPTable(1);
        lineTable.setWidthPercentage(100);
        lineTable.setSpacingAfter(12);
        PdfPCell lineCell = new PdfPCell();
        lineCell.setFixedHeight(2f);
        lineCell.setBackgroundColor(ACCENT_INDIGO);
        lineCell.setBorder(Rectangle.NO_BORDER);
        lineTable.addCell(lineCell);
        doc.add(lineTable);
    }

    private void addReferenceDateBar(Document doc, GeneratedLetter letter) throws Exception {
        PdfPTable refTable = new PdfPTable(2);
        refTable.setWidthPercentage(100);
        refTable.setWidths(new float[]{60f, 40f});
        refTable.setSpacingAfter(14);

        Font refFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, PRIMARY_DARK);
        Font dateFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, PRIMARY_DARK);

        PdfPCell c1 = new PdfPCell(new Phrase("Ref: " + letter.getReferenceNumber(), refFont));
        c1.setBorder(Rectangle.NO_BORDER);
        c1.setPadding(0);
        refTable.addCell(c1);

        String dateStr = letter.getIssueDate() != null ? letter.getIssueDate().format(DATE_FMT) : "—";
        PdfPCell c2 = new PdfPCell(new Phrase("Date: " + dateStr, dateFont));
        c2.setBorder(Rectangle.NO_BORDER);
        c2.setPadding(0);
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        refTable.addCell(c2);

        doc.add(refTable);
    }

    private void addTitleBanner(Document doc, GeneratedLetter letter) throws Exception {
        String titleText;
        switch (letter.getLetterType()) {
            case OFFER_LETTER -> titleText = "LETTER OF OFFER & APPOINTMENT";
            case EXPERIENCE_CERTIFICATE -> titleText = "EXPERIENCE CERTIFICATE";
            case RELIEVING_LETTER -> titleText = "RELIEVING LETTER & SERVICE CLEARANCE";
            default -> titleText = letter.getTitle() != null ? letter.getTitle().toUpperCase() : "HR DOCUMENT";
        }

        PdfPTable banner = new PdfPTable(1);
        banner.setWidthPercentage(100);
        banner.setSpacingAfter(14);

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Color.WHITE);
        PdfPCell cell = new PdfPCell(new Phrase(titleText, titleFont));
        cell.setBackgroundColor(PRIMARY_INDIGO);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setPaddingTop(6f);
        cell.setPaddingBottom(6f);
        cell.setBorder(Rectangle.NO_BORDER);
        banner.addCell(cell);
        doc.add(banner);

        if (letter.getLetterType() == GeneratedLetter.LetterType.EXPERIENCE_CERTIFICATE) {
            Font toWhomFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, PRIMARY_DARK);
            Paragraph toWhom = new Paragraph("TO WHOMSOEVER IT MAY CONCERN", toWhomFont);
            toWhom.setAlignment(Element.ALIGN_CENTER);
            toWhom.setSpacingAfter(14);
            doc.add(toWhom);
        }
    }

    // ─── 1. OFFER LETTER ──────────────────────────────────────────────────────────

    private void renderOfferLetterContent(Document doc, GeneratedLetter letter) throws Exception {
        Font boldText = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, TEXT_DARK);
        Font normText = FontFactory.getFont(FontFactory.HELVETICA, 9, TEXT_DARK);
        Font secFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, PRIMARY_INDIGO);

        // Recipient Address Block
        Paragraph recBlock = new Paragraph();
        recBlock.setSpacingAfter(12);
        recBlock.add(new Phrase("To,\n", normText));
        recBlock.add(new Phrase(letter.getRecipientName() + "\n", boldText));
        if (letter.getRecipientAddress() != null && !letter.getRecipientAddress().isBlank()) {
            recBlock.add(new Phrase(letter.getRecipientAddress() + "\n", normText));
        }
        if (letter.getRecipientEmail() != null && !letter.getRecipientEmail().isBlank()) {
            recBlock.add(new Phrase("Email: " + letter.getRecipientEmail() + "\n", normText));
        }
        if (letter.getRecipientPhone() != null && !letter.getRecipientPhone().isBlank()) {
            recBlock.add(new Phrase("Phone: " + letter.getRecipientPhone() + "\n", normText));
        }
        doc.add(recBlock);

        // Subject
        Paragraph subj = new Paragraph();
        subj.setSpacingAfter(10);
        subj.add(new Phrase("Subject: ", boldText));
        subj.add(new Phrase("Offer of Employment for the position of " + safeStr(letter.getDesignation(), "Professional"), boldText));
        doc.add(subj);

        // Salutation
        Paragraph salutation = new Paragraph("Dear " + letter.getRecipientName() + ",\n\n", normText);
        String companyName = letter.getCompany() != null && letter.getCompany().getName() != null
                ? letter.getCompany().getName() : "the Company";

        salutation.add(new Phrase(
                "We are pleased to extend an offer of employment to you for the position of "
                + safeStr(letter.getDesignation(), "the designated position")
                + (letter.getDepartment() != null ? " in the " + letter.getDepartment() + " Department" : "")
                + " with " + companyName + ". "
                + "We believe your experience, skills, and background will be a valuable addition to our team.",
                normText
        ));
        salutation.setSpacingAfter(10);
        doc.add(salutation);

        // Terms Table
        Paragraph termsHead = new Paragraph("Summary of Terms & Compensation", secFont);
        termsHead.setSpacingAfter(6);
        doc.add(termsHead);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{40f, 60f});
        table.setSpacingAfter(12);

        addTableRow(table, "Position / Designation", safeStr(letter.getDesignation(), "—"));
        addTableRow(table, "Department", safeStr(letter.getDepartment(), "—"));
        addTableRow(table, "Employment Type", safeStr(letter.getEmploymentType(), "Full-Time"));
        addTableRow(table, "Expected Date of Joining", letter.getJoiningDate() != null ? letter.getJoiningDate().format(DATE_FMT) : "To be confirmed");

        String salaryStr = formatSalary(letter);
        addTableRow(table, "Total Compensation (" + safeStr(letter.getCurrency(), "USD") + ")", salaryStr);
        addTableRow(table, "Work Location", safeStr(letter.getWorkLocation(), "Company Office / Hybrid"));
        addTableRow(table, "Probation Period", safeStr(letter.getProbationPeriod(), "3 Months"));
        addTableRow(table, "Notice Period", safeStr(letter.getNoticePeriod(), "30 Days"));
        if (letter.getAcceptanceDeadline() != null) {
            addTableRow(table, "Offer Acceptance Deadline", letter.getAcceptanceDeadline().format(DATE_FMT));
        }

        doc.add(table);

        // Standard Clauses
        Paragraph clauses = new Paragraph();
        clauses.setSpacingAfter(10);
        clauses.add(new Phrase("Key Terms & Conditions:\n", secFont));
        clauses.add(new Phrase("1. Roles & Duties: You will perform the responsibilities assigned to your role with diligence, complying with all company policies and professional standards.\n", normText));
        clauses.add(new Phrase("2. Confidentiality: You agree to keep strictly confidential all company proprietary data, customer information, trade secrets, and intellectual property.\n", normText));
        clauses.add(new Phrase("3. Background Verification: This offer is contingent upon satisfactory completion of background verification, reference checks, and credential validation.\n", normText));
        clauses.add(new Phrase("4. Documentation: Please bring copies of your academic certificates, identity proof, relieving letter from previous employers, and photographs on your date of joining.\n", normText));

        if (letter.getCustomTerms() != null && !letter.getCustomTerms().isBlank()) {
            clauses.add(new Phrase("5. Additional Terms: " + letter.getCustomTerms() + "\n", normText));
        }
        doc.add(clauses);

        // Acceptance Note
        Paragraph acceptNote = new Paragraph(
                "Please review this offer letter carefully. To confirm your acceptance, sign and date the acceptance section below and return a duplicate copy to our Human Resources department on or before "
                + (letter.getAcceptanceDeadline() != null ? letter.getAcceptanceDeadline().format(DATE_FMT) : "the agreed date") + ".",
                normText
        );
        acceptNote.setSpacingAfter(16);
        doc.add(acceptNote);
    }

    // ─── 2. EXPERIENCE CERTIFICATE ────────────────────────────────────────────────

    private void renderExperienceCertificateContent(Document doc, GeneratedLetter letter) throws Exception {
        Font boldText = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, TEXT_DARK);
        Font normText = FontFactory.getFont(FontFactory.HELVETICA, 9, TEXT_DARK);
        Font secFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, PRIMARY_INDIGO);

        String companyName = letter.getCompany() != null && letter.getCompany().getName() != null
                ? letter.getCompany().getName() : "the Company";

        String joinDateStr = letter.getJoiningDate() != null ? letter.getJoiningDate().format(DATE_FMT) : "—";
        String leaveDateStr = letter.getRelievingDate() != null ? letter.getRelievingDate().format(DATE_FMT) : "—";

        Paragraph introP = new Paragraph();
        introP.setSpacingAfter(12);
        introP.add(new Phrase("This is to certify that ", normText));
        introP.add(new Phrase(letter.getRecipientName(), boldText));
        if (letter.getEmployee() != null && letter.getEmployee().getBadgeId() != null) {
            introP.add(new Phrase(" (Employee ID: " + letter.getEmployee().getBadgeId() + ")", normText));
        }
        introP.add(new Phrase(" was employed with ", normText));
        introP.add(new Phrase(companyName, boldText));
        introP.add(new Phrase(" from ", normText));
        introP.add(new Phrase(joinDateStr, boldText));
        introP.add(new Phrase(" to ", normText));
        introP.add(new Phrase(leaveDateStr, boldText));
        introP.add(new Phrase(". During this tenure, " + getPronounSubject(letter) + " served as ", normText));
        introP.add(new Phrase(safeStr(letter.getDesignation(), "Staff Member"), boldText));
        if (letter.getDepartment() != null && !letter.getDepartment().isBlank()) {
            introP.add(new Phrase(" in the " + letter.getDepartment() + " Department.", normText));
        } else {
            introP.add(new Phrase(".", normText));
        }
        doc.add(introP);

        // Employment Summary Table
        Paragraph sumHead = new Paragraph("Employment Record Summary", secFont);
        sumHead.setSpacingAfter(6);
        doc.add(sumHead);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{40f, 60f});
        table.setSpacingAfter(12);

        addTableRow(table, "Employee Name", letter.getRecipientName());
        if (letter.getEmployee() != null && letter.getEmployee().getBadgeId() != null) {
            addTableRow(table, "Employee ID", letter.getEmployee().getBadgeId());
        }
        addTableRow(table, "Designation / Role", safeStr(letter.getDesignation(), "—"));
        addTableRow(table, "Department", safeStr(letter.getDepartment(), "—"));
        addTableRow(table, "Date of Joining", joinDateStr);
        addTableRow(table, "Date of Relieving", leaveDateStr);
        addTableRow(table, "Work Location", safeStr(letter.getWorkLocation(), companyName + " Corporate Office"));
        addTableRow(table, "Conduct & Performance", safeStr(letter.getConduct(), "Excellent"));

        doc.add(table);

        // Performance & Character Narrative
        Paragraph narrative = new Paragraph();
        narrative.setSpacingAfter(12);
        String duties = letter.getDutiesAndPerformance();
        if (duties != null && !duties.isBlank()) {
            narrative.add(new Phrase(duties + "\n\n", normText));
        } else {
            narrative.add(new Phrase(
                    "During " + getPronounPossessive(letter) + " tenure with " + companyName + ", "
                    + getPronounSubject(letter) + " displayed high levels of dedication, commitment, and sincerity. "
                    + getPronounSubject(letter, true) + " carried out all responsibilities with utmost integrity, professionalism, "
                    + "and teamwork, maintaining exemplary relationships with peers, management, and clients.\n\n",
                    normText
            ));
        }

        narrative.add(new Phrase(
                "We express our appreciation for " + getPronounPossessive(letter) + " contributions to the organization "
                + "and take this opportunity to wish " + getPronounObject(letter) + " every success in all future personal and professional endeavors.",
                normText
        ));
        doc.add(narrative);

        if (letter.getCustomTerms() != null && !letter.getCustomTerms().isBlank()) {
            Paragraph notes = new Paragraph("Additional Remarks:\n" + letter.getCustomTerms(), normText);
            notes.setSpacingAfter(14);
            doc.add(notes);
        }
    }

    // ─── 3. RELIEVING LETTER ──────────────────────────────────────────────────────

    private void renderRelievingLetterContent(Document doc, GeneratedLetter letter) throws Exception {
        Font boldText = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, TEXT_DARK);
        Font normText = FontFactory.getFont(FontFactory.HELVETICA, 9, TEXT_DARK);
        Font secFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, PRIMARY_INDIGO);

        String companyName = letter.getCompany() != null && letter.getCompany().getName() != null
                ? letter.getCompany().getName() : "the Company";

        String relievingDateStr = letter.getRelievingDate() != null ? letter.getRelievingDate().format(DATE_FMT) : "—";
        String resignationDateStr = letter.getResignationDate() != null ? letter.getResignationDate().format(DATE_FMT) : "the tendered date";

        // Recipient Address Block
        Paragraph recBlock = new Paragraph();
        recBlock.setSpacingAfter(12);
        recBlock.add(new Phrase("To,\n", normText));
        recBlock.add(new Phrase(letter.getRecipientName() + "\n", boldText));
        if (letter.getEmployee() != null && letter.getEmployee().getBadgeId() != null) {
            recBlock.add(new Phrase("Employee ID: " + letter.getEmployee().getBadgeId() + "\n", normText));
        }
        if (letter.getDesignation() != null) {
            recBlock.add(new Phrase("Designation: " + letter.getDesignation() + "\n", normText));
        }
        if (letter.getDepartment() != null) {
            recBlock.add(new Phrase("Department: " + letter.getDepartment() + "\n", normText));
        }
        doc.add(recBlock);

        // Subject
        Paragraph subj = new Paragraph();
        subj.setSpacingAfter(10);
        subj.add(new Phrase("Subject: ", boldText));
        subj.add(new Phrase("Relieving Order & Acceptance of Resignation", boldText));
        doc.add(subj);

        // Body Salutation & Confirmation
        Paragraph salutation = new Paragraph("Dear " + letter.getRecipientName() + ",\n\n", normText);
        salutation.add(new Phrase(
                "With reference to your formal letter of resignation dated " + resignationDateStr
                + ", we hereby confirm that your resignation has been accepted by the management of " + companyName + ".\n\n"
                + "You are relieved from your duties and responsibilities as "
                + safeStr(letter.getDesignation(), "an employee")
                + (letter.getDepartment() != null ? " in the " + letter.getDepartment() + " Department" : "")
                + " with effect from the close of business hours on " + relievingDateStr + ".",
                normText
        ));
        salutation.setSpacingAfter(12);
        doc.add(salutation);

        // Clearance Summary Table
        Paragraph clearHead = new Paragraph("Full & Final Clearance Confirmation", secFont);
        clearHead.setSpacingAfter(6);
        doc.add(clearHead);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{40f, 60f});
        table.setSpacingAfter(12);

        addTableRow(table, "Employee Name", letter.getRecipientName());
        addTableRow(table, "Designation", safeStr(letter.getDesignation(), "—"));
        addTableRow(table, "Date of Joining", letter.getJoiningDate() != null ? letter.getJoiningDate().format(DATE_FMT) : "—");
        addTableRow(table, "Resignation Tendered On", resignationDateStr);
        addTableRow(table, "Official Relieving Date", relievingDateStr);

        boolean duesCleared = letter.getDuesCleared() == null || Boolean.TRUE.equals(letter.getDuesCleared());
        addTableRow(table, "Company Assets & Access Handover", duesCleared ? "Completed & Verified" : "Pending Clearance");
        addTableRow(table, "Full & Final Settlement of Dues", duesCleared ? "Reconciled & Cleared" : "In Process");

        doc.add(table);

        // Closing Clauses & Confidentiality
        Paragraph closingP = new Paragraph();
        closingP.setSpacingAfter(12);
        closingP.add(new Phrase(
                "Please note that all confidentiality, non-disclosure, intellectual property, and proprietary obligations "
                + "entered into during your tenure with " + companyName + " remain in full force and effect following your departure.\n\n",
                normText
        ));
        closingP.add(new Phrase(
                "We sincerely thank you for your services, dedication, and contributions during your tenure with " + companyName
                + ", and wish you the very best in your future career endeavors.",
                normText
        ));
        doc.add(closingP);

        if (letter.getCustomTerms() != null && !letter.getCustomTerms().isBlank()) {
            Paragraph customP = new Paragraph("Additional Notes:\n" + letter.getCustomTerms(), normText);
            customP.setSpacingAfter(14);
            doc.add(customP);
        }
    }

    // ─── Signatures Block ────────────────────────────────────────────────────────

    private void addSignatureBlock(Document doc, GeneratedLetter letter) throws Exception {
        Company company = letter.getCompany();
        String companyName = company != null && company.getName() != null ? company.getName() : "AccrueHR";
        String signatoryName = safeStr(letter.getSignatoryName(), "Authorized Signatory");
        String signatoryDesig = safeStr(letter.getSignatoryDesignation(), "Human Resources Department");

        Font boldText = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, TEXT_DARK);
        Font normText = FontFactory.getFont(FontFactory.HELVETICA, 8, TEXT_MUTED);

        PdfPTable sigTable = new PdfPTable(2);
        sigTable.setWidthPercentage(100);
        sigTable.setWidths(new float[]{50f, 50f});
        sigTable.setSpacingBefore(18);
        sigTable.setSpacingAfter(10);

        // Left: Employer Signatory
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.setPadding(0);

        leftCell.addElement(new Paragraph("For " + companyName + ",", boldText));

        // Optional Signature Image
        boolean sigRendered = false;
        if (company != null && company.getSignaturePath() != null) {
            try {
                Path sp = Paths.get(company.getSignaturePath());
                if (Files.exists(sp) && isPdfLogoSupported(sp.toString())) {
                    Image sig = Image.getInstance(sp.toAbsolutePath().toString());
                    sig.scaleToFit(110, 40);
                    leftCell.addElement(sig);
                    sigRendered = true;
                }
            } catch (Exception ignored) {}
        }

        if (!sigRendered) {
            Paragraph space = new Paragraph("\n\n\n", normText);
            leftCell.addElement(space);
        }

        Paragraph sigInfo = new Paragraph();
        sigInfo.add(new Phrase("___________________________\n", normText));
        sigInfo.add(new Phrase(signatoryName + "\n", boldText));
        sigInfo.add(new Phrase(signatoryDesig + "\n", normText));
        sigInfo.add(new Phrase(companyName, normText));
        leftCell.addElement(sigInfo);
        sigTable.addCell(leftCell);

        // Right: Stamp or Candidate Acceptance
        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setPadding(0);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        if (letter.getLetterType() == GeneratedLetter.LetterType.OFFER_LETTER) {
            Paragraph accHead = new Paragraph("Candidate Acceptance:", boldText);
            accHead.setAlignment(Element.ALIGN_RIGHT);
            rightCell.addElement(accHead);

            Paragraph accText = new Paragraph("I accept the terms and conditions outlined in this offer.", normText);
            accText.setAlignment(Element.ALIGN_RIGHT);
            accText.setSpacingAfter(25);
            rightCell.addElement(accText);

            Paragraph accSign = new Paragraph();
            accSign.setAlignment(Element.ALIGN_RIGHT);
            accSign.add(new Phrase("___________________________\n", normText));
            accSign.add(new Phrase("Signature: " + letter.getRecipientName() + "\n", boldText));
            accSign.add(new Phrase("Date: ____________________", normText));
            rightCell.addElement(accSign);
        } else {
            // For Experience / Relieving: Company Seal/Stamp block
            boolean stampRendered = false;
            if (company != null && company.getStampPath() != null) {
                try {
                    Path sp = Paths.get(company.getStampPath());
                    if (Files.exists(sp) && isPdfLogoSupported(sp.toString())) {
                        Image stamp = Image.getInstance(sp.toAbsolutePath().toString());
                        stamp.scaleToFit(90, 90);
                        stamp.setAlignment(Element.ALIGN_RIGHT);
                        rightCell.addElement(stamp);
                        stampRendered = true;
                    }
                } catch (Exception ignored) {}
            }

            if (!stampRendered) {
                Paragraph sealBox = new Paragraph();
                sealBox.setAlignment(Element.ALIGN_RIGHT);
                sealBox.add(new Phrase("[ Official Company Seal ]\n\n\n\n", normText));
                sealBox.add(new Phrase("Authorized HR Verification", normText));
                rightCell.addElement(sealBox);
            }
        }

        sigTable.addCell(rightCell);
        doc.add(sigTable);
    }

    private void addFooterNotice(Document doc, GeneratedLetter letter) throws Exception {
        Font footFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 7, TEXT_MUTED);
        String companyName = letter.getCompany() != null && letter.getCompany().getName() != null
                ? letter.getCompany().getName() : "AccrueHR";

        Paragraph footer = new Paragraph(
                "This document is an official corporate communication issued by " + companyName
                + " • Reference: " + letter.getReferenceNumber()
                + " • Issued on " + (letter.getIssueDate() != null ? letter.getIssueDate().format(DATE_FMT) : "")
                + " • Strictly Confidential",
                footFont
        );
        footer.setAlignment(Element.ALIGN_CENTER);
        footer.setSpacingBefore(12);
        doc.add(footer);
    }

    // ─── Table Utilities ──────────────────────────────────────────────────────────

    private void addTableRow(PdfPTable table, String label, String value) {
        Font lblFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, PRIMARY_DARK);
        Font valFont = FontFactory.getFont(FontFactory.HELVETICA, 8, TEXT_DARK);

        PdfPCell c1 = new PdfPCell(new Phrase(label, lblFont));
        c1.setBackgroundColor(BG_HEADER);
        c1.setBorderColor(BORDER_COLOR);
        c1.setPadding(6f);

        PdfPCell c2 = new PdfPCell(new Phrase(value, valFont));
        c2.setBackgroundColor(BG_LIGHT);
        c2.setBorderColor(BORDER_COLOR);
        c2.setPadding(6f);

        table.addCell(c1);
        table.addCell(c2);
    }

    private String formatSalary(GeneratedLetter letter) {
        if (letter.getSalary() == null) return "As mutually agreed";
        DecimalFormat df = new DecimalFormat("#,##0.00");
        String formatted = df.format(letter.getSalary());
        String curr = letter.getCurrency() != null ? letter.getCurrency() : "USD";
        String freq = letter.getSalaryFrequency() != null ? letter.getSalaryFrequency() : "Per Annum";
        return curr + " " + formatted + " (" + freq + ")";
    }

    private String safeStr(String str, String fallback) {
        return (str != null && !str.isBlank()) ? str : fallback;
    }

    private String getPronounSubject(GeneratedLetter letter) {
        return getPronounSubject(letter, false);
    }

    private String getPronounSubject(GeneratedLetter letter, boolean capitalize) {
        if (letter.getEmployee() != null && letter.getEmployee().getGender() != null) {
            String g = letter.getEmployee().getGender().name();
            if ("FEMALE".equalsIgnoreCase(g)) return capitalize ? "She" : "she";
            if ("MALE".equalsIgnoreCase(g)) return capitalize ? "He" : "he";
        }
        return capitalize ? "He/She" : "he/she";
    }

    private String getPronounPossessive(GeneratedLetter letter) {
        if (letter.getEmployee() != null && letter.getEmployee().getGender() != null) {
            String g = letter.getEmployee().getGender().name();
            if ("FEMALE".equalsIgnoreCase(g)) return "her";
            if ("MALE".equalsIgnoreCase(g)) return "his";
        }
        return "his/her";
    }

    private String getPronounObject(GeneratedLetter letter) {
        if (letter.getEmployee() != null && letter.getEmployee().getGender() != null) {
            String g = letter.getEmployee().getGender().name();
            if ("FEMALE".equalsIgnoreCase(g)) return "her";
            if ("MALE".equalsIgnoreCase(g)) return "him";
        }
        return "him/her";
    }

    private boolean isPdfLogoSupported(String logoPath) {
        String lower = logoPath.toLowerCase(Locale.ROOT);
        return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")
                || lower.endsWith(".gif") || lower.endsWith(".bmp");
    }
}
