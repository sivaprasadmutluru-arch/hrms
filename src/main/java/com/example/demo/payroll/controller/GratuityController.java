package com.example.demo.payroll.controller;

import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.payroll.entity.GratuityCalculation;
import com.example.demo.payroll.repository.GratuityCalculationRepository;
import com.example.demo.payroll.service.GratuityService;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gratuity")
@RequiredArgsConstructor
@Tag(name = "Gratuity / EOSB")
public class GratuityController {

    private final GratuityService gratuityService;
    private final GratuityCalculationRepository gratuityRepo;
    private final EmployeeRepository employeeRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('payroll:view')")
    @Operation(summary = "List all gratuity/EOSB records (company-scoped)")
    public ResponseEntity<List<GratuityCalculation>> list() {
        return ResponseEntity.ok(gratuityService.listForCurrentScope());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Operation(summary = "Get a single gratuity record by ID")
    public ResponseEntity<GratuityCalculation> getById(@PathVariable Long id) {
        return ResponseEntity.ok(gratuityService.getById(id));
    }

    @PostMapping("/calculate")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER','ACCOUNTANT')")
    @Operation(summary = "Calculate EOSB for an employee and save as DRAFT")
    public ResponseEntity<GratuityCalculation> calculate(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(gratuityService.calculate(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER','ACCOUNTANT')")
    @Operation(summary = "Manually edit a gratuity record (admin override)")
    public ResponseEntity<GratuityCalculation> update(@PathVariable Long id,
                                                       @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(gratuityService.update(id, request));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')")
    @Operation(summary = "Approve a gratuity/EOSB record")
    public ResponseEntity<GratuityCalculation> approve(@PathVariable Long id) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        Long userId = scope != null ? scope.getUserId() : null;
        Long approverEmployeeId = userId != null
                ? employeeRepository.findByUserId(userId).map(e -> e.getId()).orElse(null)
                : null;
        if (approverEmployeeId == null) {
            // Try to get from any employee linked to company
            GratuityCalculation calc = gratuityService.getById(id);
            approverEmployeeId = calc.getEmployee().getId();
        }
        return ResponseEntity.ok(gratuityService.approve(id, approverEmployeeId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')")
    @Operation(summary = "Delete a gratuity record")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        gratuityService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/report")
    @PreAuthorize("hasAuthority('payroll:view')")
    @Operation(summary = "Download PDF report for a gratuity/EOSB record")
    public ResponseEntity<byte[]> downloadReport(@PathVariable Long id) {
        GratuityCalculation calc = gratuityService.getById(id);
        byte[] pdf = generatePdfReport(calc);
        String filename = "EOSB_" + calc.getEmployee().getFirstName() + "_" +
                calc.getEmployee().getLastName() + "_" + calc.getLastWorkingDate() + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ─── PDF Generation ───────────────────────────────────────────────────────

    private byte[] generatePdfReport(GratuityCalculation calc) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 60, 60);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Color purple = new Color(102, 51, 153);
            Color lightGrey = new Color(245, 245, 245);

            Font titleFont     = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, purple);
            Font headerFont    = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.WHITE);
            Font labelFont     = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);
            Font valueFont     = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
            Font sectionFont   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, purple);
            Font smallFont     = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY);

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy");

            // Title
            Paragraph title = new Paragraph("END OF SERVICE BENEFITS (EOSB) SETTLEMENT", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(4);
            doc.add(title);

            Paragraph subtitle = new Paragraph("UAE Labour Law — Final Settlement Report", smallFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20);
            doc.add(subtitle);

            // Employee Info table
            doc.add(sectionParagraph("Employee Information", sectionFont));
            PdfPTable empTable = new PdfPTable(2);
            empTable.setWidthPercentage(100);
            empTable.setSpacingBefore(6);
            empTable.setSpacingAfter(14);

            String empName = calc.getEmployee().getFirstName() + " " + calc.getEmployee().getLastName();
            String dept = calc.getEmployee().getDepartment() != null
                    ? calc.getEmployee().getDepartment().getName() : "—";
            String pos = calc.getEmployee().getJobPosition() != null
                    ? calc.getEmployee().getJobPosition().getName() : "—";

            addInfoRow(empTable, "Employee Name", empName, labelFont, valueFont, lightGrey);
            addInfoRow(empTable, "Department", dept, labelFont, valueFont, Color.WHITE);
            addInfoRow(empTable, "Designation", pos, labelFont, valueFont, lightGrey);
            addInfoRow(empTable, "Contract Type", calc.getContractType().name(), labelFont, valueFont, Color.WHITE);
            addInfoRow(empTable, "Joining Date", calc.getJoiningDate().format(fmt), labelFont, valueFont, lightGrey);
            addInfoRow(empTable, "Last Working Date", calc.getLastWorkingDate().format(fmt), labelFont, valueFont, Color.WHITE);
            addInfoRow(empTable, "Total Service Period",
                    calc.getCompletedYears() + " Years, " + calc.getCompletedMonths() + " Months, " + calc.getCompletedDays() + " Days",
                    labelFont, valueFont, lightGrey);
            doc.add(empTable);

            // Gratuity Calculation
            doc.add(sectionParagraph("Gratuity Calculation (UAE Labour Law)", sectionFont));
            PdfPTable calcTable = new PdfPTable(2);
            calcTable.setWidthPercentage(100);
            calcTable.setSpacingBefore(6);
            calcTable.setSpacingAfter(14);

            addInfoRow(calcTable, "Basic Salary (Monthly)", fmt(calc.getBasicSalary()), labelFont, valueFont, lightGrey);
            addInfoRow(calcTable, "Daily Basic Salary (÷30)", fmt(calc.getDailyBasicSalary()), labelFont, valueFont, Color.WHITE);
            addInfoRow(calcTable, "Gratuity Days", calc.getGratuityDays().setScale(2, java.math.RoundingMode.HALF_UP).toPlainString(), labelFont, valueFont, lightGrey);
            addInfoRow(calcTable, "Gratuity Amount", fmt(calc.getGratuityAmount()), labelFont, valueFont, Color.WHITE);
            doc.add(calcTable);

            // Settlement Items
            doc.add(sectionParagraph("Final Settlement Breakdown", sectionFont));
            PdfPTable settlTable = new PdfPTable(2);
            settlTable.setWidthPercentage(100);
            settlTable.setSpacingBefore(6);
            settlTable.setSpacingAfter(6);

            boolean alt = false;
            addInfoRow(settlTable, "Gratuity Amount", fmt(calc.getGratuityAmount()), labelFont, valueFont, alt ? lightGrey : Color.WHITE); alt = !alt;
            addInfoRow(settlTable, "Leave Encashment (" + calc.getLeaveEncashmentDays().setScale(1, java.math.RoundingMode.HALF_UP) + " days)", fmt(calc.getLeaveEncashmentAmount()), labelFont, valueFont, alt ? lightGrey : Color.WHITE); alt = !alt;
            addInfoRow(settlTable, "Pending Salary", fmt(calc.getPendingSalary()), labelFont, valueFont, alt ? lightGrey : Color.WHITE); alt = !alt;
            addInfoRow(settlTable, "Air Ticket Allowance", fmt(calc.getAirTicketAllowance()), labelFont, valueFont, alt ? lightGrey : Color.WHITE); alt = !alt;
            addInfoRow(settlTable, "Loan Deduction (−)", fmt(calc.getLoanDeduction()), labelFont, valueFont, alt ? lightGrey : Color.WHITE); alt = !alt;
            addInfoRow(settlTable, "Notice Period Deduction (−)", fmt(calc.getNoticePeriodDeduction()), labelFont, valueFont, alt ? lightGrey : Color.WHITE); alt = !alt;
            addInfoRow(settlTable, "Other Deductions (−)", fmt(calc.getOtherDeductions()), labelFont, valueFont, alt ? lightGrey : Color.WHITE);

            doc.add(settlTable);

            // Final amount highlight
            PdfPTable totalTable = new PdfPTable(2);
            totalTable.setWidthPercentage(100);
            totalTable.setSpacingBefore(4);
            totalTable.setSpacingAfter(24);
            Font totalLabelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.WHITE);
            Font totalValueFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.WHITE);
            PdfPCell totalLabelCell = new PdfPCell(new Phrase("TOTAL FINAL SETTLEMENT AMOUNT", totalLabelFont));
            PdfPCell totalValueCell = new PdfPCell(new Phrase(fmt(calc.getFinalSettlementAmount()), totalValueFont));
            totalLabelCell.setBackgroundColor(purple);
            totalValueCell.setBackgroundColor(purple);
            totalLabelCell.setPadding(10);
            totalValueCell.setPadding(10);
            totalValueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalTable.addCell(totalLabelCell);
            totalTable.addCell(totalValueCell);
            doc.add(totalTable);

            // Notes
            if (calc.getNotes() != null && !calc.getNotes().isBlank()) {
                doc.add(sectionParagraph("Notes", sectionFont));
                Paragraph notes = new Paragraph(calc.getNotes(), valueFont);
                notes.setSpacingAfter(20);
                doc.add(notes);
            }

            // Status
            String statusLine = "Status: " + calc.getStatus().name();
            if (calc.getApprovedBy() != null) {
                statusLine += " — Approved by: " + calc.getApprovedBy().getFirstName() + " " + calc.getApprovedBy().getLastName();
            }
            doc.add(new Paragraph(statusLine, smallFont));

            // Signature section
            doc.add(Chunk.NEWLINE);
            doc.add(Chunk.NEWLINE);
            PdfPTable sigTable = new PdfPTable(2);
            sigTable.setWidthPercentage(100);
            sigTable.setSpacingBefore(20);
            addSignatureCell(sigTable, "HR Signature", valueFont);
            addSignatureCell(sigTable, "Employee Signature", valueFont);
            doc.add(sigTable);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }

    private Paragraph sectionParagraph(String text, Font font) {
        Paragraph p = new Paragraph(text, font);
        p.setSpacingBefore(10);
        p.setSpacingAfter(4);
        return p;
    }

    private void addInfoRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont, Color bg) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        PdfPCell valueCell = new PdfPCell(new Phrase(value != null ? value : "—", valueFont));
        labelCell.setBackgroundColor(bg);
        valueCell.setBackgroundColor(bg);
        labelCell.setPadding(6);
        valueCell.setPadding(6);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addSignatureCell(PdfPTable table, String label, Font font) {
        PdfPCell cell = new PdfPCell();
        cell.addElement(new Paragraph("\n\n\n___________________________", font));
        cell.addElement(new Paragraph(label, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(10);
        table.addCell(cell);
    }

    private String fmt(BigDecimal val) {
        if (val == null) return "0.00";
        return String.format("%,.2f", val);
    }
}
