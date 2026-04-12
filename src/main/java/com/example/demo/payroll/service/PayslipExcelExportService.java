package com.example.demo.payroll.service;

import com.example.demo.employee.entity.Employee;
import com.example.demo.payroll.entity.Contract;
import com.example.demo.payroll.entity.Payslip;
import com.example.demo.payroll.repository.ContractRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PayslipExcelExportService {

    private final ContractRepository contractRepository;

    /**
     * GCP payslip_import_download format:
     * - One sheet per company
     * - Green (static): Employee Id, Employee Name, Department, Basic Pay,
     *                   Housing Allowance, Transport Allowance, Other Allowance, Gross Pay
     * - Orange (variable): Total Paid Days, LOP, salary_advance_loan_recovery,
     *                      Deduction, Overtime, salary_advance, bonus, Net Pay
     * - Labels row at the bottom
     */
    public byte[] exportPayslips(List<Payslip> payslips, LocalDate startDate, LocalDate endDate) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {

            // Group payslips by company name
            Map<String, List<Payslip>> byCompany = new LinkedHashMap<>();
            for (Payslip p : payslips) {
                String name = p.getCompany() != null && p.getCompany().getName() != null
                        ? p.getCompany().getName() : "Unknown Company";
                byCompany.computeIfAbsent(sanitizeSheetName(name), k -> new ArrayList<>()).add(p);
            }

            if (byCompany.isEmpty()) {
                // Create a placeholder sheet so the file is valid
                workbook.createSheet("No Data");
            }

            for (Map.Entry<String, List<Payslip>> entry : byCompany.entrySet()) {
                buildCompanySheet(workbook, entry.getKey(), entry.getValue());
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        }
    }

    private String sanitizeSheetName(String name) {
        // Excel sheet names: max 31 chars, no /\?*[]
        String s = name.replaceAll("[/\\\\?*\\[\\]]", "_");
        return s.length() > 31 ? s.substring(0, 31) : s;
    }

    private void buildCompanySheet(XSSFWorkbook wb, String sheetName, List<Payslip> payslips) {
        XSSFSheet sheet = wb.createSheet(sheetName);

        // ── Styles ────────────────────────────────────────────────────────
        CellStyle greenHeader = coloredStyle(wb, new byte[]{(byte)0xD8,(byte)0xE4,(byte)0xBC}, true);
        CellStyle greenData   = coloredStyle(wb, new byte[]{(byte)0xD8,(byte)0xE4,(byte)0xBC}, false);
        CellStyle orangeHeader= coloredStyle(wb, new byte[]{(byte)0xFC,(byte)0xD5,(byte)0xB4}, true);
        CellStyle orangeData  = coloredStyle(wb, new byte[]{(byte)0xFC,(byte)0xD5,(byte)0xB4}, false);

        // Label styles
        XSSFCellStyle labelGreen = wb.createCellStyle();
        labelGreen.setFillForegroundColor(new XSSFColor(new byte[]{(byte)0x90,(byte)0xEE,(byte)0x90}, null));
        labelGreen.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont lgf = wb.createFont(); lgf.setBold(true); labelGreen.setFont(lgf);

        XSSFCellStyle labelOrange = wb.createCellStyle();
        labelOrange.setFillForegroundColor(new XSSFColor(new byte[]{(byte)0xFF,(byte)0xA5,(byte)0x00}, null));
        labelOrange.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont lof = wb.createFont(); lof.setBold(true); labelOrange.setFont(lof);

        // ── Column widths ─────────────────────────────────────────────────
        for (int i = 0; i < 16; i++) sheet.setColumnWidth(i, 18 * 256);

        // ── Row 0: Headers ────────────────────────────────────────────────
        String[] staticCols  = {"Employee Id","Employee Name","Department",
                                "Basic Pay","Housing Allowance","Transport Allowance","Other Allowance","Gross Pay"};
        String[] variableCols= {"Total Paid Days","LOP","salary_advance_loan_recovery",
                                "Deduction","Overtime","salary_advance","bonus","Net Pay"};

        Row headerRow = sheet.createRow(0);
        headerRow.setHeightInPoints(20);
        int col = 0;
        for (String h : staticCols)   createCell(headerRow, col++, h, greenHeader);
        for (String h : variableCols) createCell(headerRow, col++, h, orangeHeader);

        // ── Data rows from row 1 ──────────────────────────────────────────
        int rowNum = 1;
        ObjectMapper om = new ObjectMapper();

        for (Payslip p : payslips) {
            Map<String, Object> phd = parsePhd(p.getPayHeadData(), om);

            String badgeId   = p.getEmployee() != null && p.getEmployee().getBadgeId() != null
                    ? p.getEmployee().getBadgeId() : str(p.getEmployee() != null ? p.getEmployee().getId() : null);
            String empName   = employeeName(p);
            String dept      = department(p);

            double basicPay   = phdDouble(phd, "basic_pay",    safe(p.getBasicPay()).doubleValue());
            double housing    = phdDouble(phd, "housing_allowance",   safe(p.getHousingAllowance()).doubleValue());
            double transport  = phdDouble(phd, "transport_allowance", safe(p.getTransportAllowance()).doubleValue());
            double other      = phdDouble(phd, "other_allowance",     safe(p.getOtherAllowance()).doubleValue());
            double grossPay   = safe(p.getGrossPay()).doubleValue();
            double paidDays   = calcPaidDays(p, phd);
            double lop        = phdDouble(phd, "loss_of_pay", 0);
            double loanRec    = phdDouble(phd, "loan_recovery", 0)
                              + phdDouble(phd, "salary_advance_deduction", 0);
            double otherDeduction = phdDouble(phd, "other_deduction", -1);
            if (otherDeduction < 0) {
                otherDeduction = safe(p.getDeduction()).doubleValue() - lop - loanRec;
                if (otherDeduction < 0) otherDeduction = 0;
            }
            double overtime   = phdDouble(phd, "overtime_pay", phdDouble(phd, "overtime", 0));
            double salAdv     = phdDouble(phd, "salary_advance", 0);
            double bonus      = phdDouble(phd, "bonus", 0);
            double netPay     = grossPay - (lop + loanRec + otherDeduction) + (overtime + salAdv + bonus);

            Row row = sheet.createRow(rowNum++);
            row.setHeightInPoints(18);

            createNumCell(row, 0,  badgeId,         greenData);
            createCell   (row, 1,  empName,          greenData);
            createCell   (row, 2,  dept,             greenData);
            createNumCell(row, 3,  fmtD(basicPay),   greenData);
            createNumCell(row, 4,  fmtD(housing),    greenData);
            createNumCell(row, 5,  fmtD(transport),  greenData);
            createNumCell(row, 6,  fmtD(other),      greenData);
            createNumCell(row, 7,  fmtD(grossPay),   greenData);
            createNumCell(row, 8,  fmtD(paidDays),   orangeData);
            createNumCell(row, 9,  fmtD(lop),        orangeData);
            createNumCell(row, 10, fmtD(loanRec),    orangeData);
            createNumCell(row, 11, fmtD(otherDeduction),  orangeData);
            createNumCell(row, 12, fmtD(overtime),   orangeData);
            createNumCell(row, 13, fmtD(salAdv),     orangeData);
            createNumCell(row, 14, fmtD(bonus),      orangeData);
            createNumCell(row, 15, fmtD(netPay),     orangeData);
        }

        // ── Labels row at bottom ──────────────────────────────────────────
        int lastRow = rowNum + 1;
        Row labelRow = sheet.createRow(lastRow);
        createCell(labelRow, 2,  "Static components for every payroll month",             labelGreen);
        createCell(labelRow, 8,  "Variable components to be changed/entered every month", labelOrange);
    }

    // ── Helper: parse pay_head_data JSON safely ───────────────────────────
    @SuppressWarnings("unchecked")
    private Map<String, Object> parsePhd(String json, ObjectMapper om) {
        if (json == null || json.isBlank()) return Map.of();
        try { return om.readValue(json, new TypeReference<Map<String, Object>>() {}); }
        catch (Exception e) { return Map.of(); }
    }

    private double phdDouble(Map<String, Object> phd, String key, double fallback) {
        Object v = phd.get(key);
        if (v == null) return fallback;
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return fallback; }
    }

    private double calcPaidDays(Payslip p, Map<String, Object> phd) {
        Object pd = phd.get("paid_days");
        if (pd != null) {
            try {
                double v = Double.parseDouble(pd.toString());
                if (v > 0) return v;
            } catch (Exception ignored) {}
        }
        if (p.getStartDate() != null && p.getEndDate() != null) {
            double unpaid = phdDouble(phd, "unpaid_days", 0);
            int total = p.getEndDate().getDayOfYear() - p.getStartDate().getDayOfYear() + 1;
            return total - unpaid;
        }
        return 0;
    }

    private String fmtD(double v) {
        return String.format("%.2f", v);
    }

    // createNumCell writes numeric string but as a number cell for proper Excel alignment
    private void createNumCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        try { cell.setCellValue(Double.parseDouble(value)); }
        catch (NumberFormatException e) { cell.setCellValue(value); }
        cell.setCellStyle(style);
    }

    // ── "Payroll Dashboard details" sheet — GCP-matching single sheet with 5 stacked tables ──

    private void buildDashboardSheet(XSSFWorkbook wb, List<Payslip> payslips,
                                     LocalDate startDate, LocalDate endDate) {
        XSSFSheet sheet = wb.createSheet("Payroll Dashboard details");

        // ── Styles ────────────────────────────────────────────────────────────
        // GCP heading: salmon/red #eb7968, bold, size 20, centered
        CellStyle headingStyle = sectionStyle(wb, new byte[]{(byte)0xEB, (byte)0x79, (byte)0x68});
        XSSFFont headingFont = wb.createFont();
        headingFont.setBold(true);
        headingFont.setFontHeightInPoints((short) 20);
        headingFont.setColor(new XSSFColor(new byte[]{(byte)0xFF,(byte)0xFF,(byte)0xFF}, null));
        ((XSSFCellStyle) headingStyle).setFont(headingFont);

        // GCP table header: same salmon, bold, text_wrap
        CellStyle tableHeaderStyle = sectionStyle(wb, new byte[]{(byte)0xEB, (byte)0x79, (byte)0x68});

        CellStyle dataStyle  = plainDataStyle(wb);
        CellStyle amtStyle   = amountDataStyle(wb);

        // ── Column widths (enough for all tables) ─────────────────────────────
        int numCols = 9;
        for (int i = 0; i < numCols; i++) sheet.setColumnWidth(i, 22 * 256);

        // ── ROW 0: Merged title ───────────────────────────────────────────────
        sheet.createRow(0).setHeightInPoints(30);
        String title = (startDate != null && endDate != null)
                ? "Payroll details " + startDate + " to " + endDate
                : "Payroll details";
        createCell(sheet.getRow(0), 0, title, headingStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, numCols - 1));
        for (int c = 1; c < numCols; c++) createCell(sheet.getRow(0), c, "", headingStyle);

        // ── ROW 1, 2: blank spacers ───────────────────────────────────────────
        sheet.createRow(1);
        sheet.createRow(2);

        // ═══════════════════════════════════════════════════════════════════
        // TABLE 1: Payslip list (startRow = 3)
        // Columns: Employee | Start Date | End Date | Basic Pay | Deduction | Allowance | Gross Pay | Net Pay | Status
        // ═══════════════════════════════════════════════════════════════════
        int t1Start = 3;
        String[] t1Headers = {"Employee", "Start Date", "End Date", "Basic Pay",
                              "Deduction", "Allowance", "Gross Pay", "Net Pay", "Status"};
        Row t1Head = sheet.createRow(t1Start);
        t1Head.setHeightInPoints(20);
        for (int c = 0; c < t1Headers.length; c++) createCell(t1Head, c, t1Headers[c], tableHeaderStyle);

        int rowNum = t1Start + 1;
        BigDecimal totalNetPay = BigDecimal.ZERO;
        Map<String, BigDecimal> deptTotals = new LinkedHashMap<>();

        ObjectMapper om = new ObjectMapper();
        for (Payslip p : payslips) {
            Row row = sheet.createRow(rowNum++);
            row.setHeightInPoints(18);
            BigDecimal allowance = safe(p.getHousingAllowance())
                    .add(safe(p.getTransportAllowance()))
                    .add(safe(p.getOtherAllowance()));
            String dept = department(p);

            Map<String, Object> phd = parsePhd(p.getPayHeadData(), om);
            double lopD      = phdDouble(phd, "loss_of_pay", 0);
            double loanRecD  = phdDouble(phd, "loan_recovery", 0)
                             + phdDouble(phd, "salary_advance_deduction", 0);
            double otherDedD = phdDouble(phd, "other_deduction", -1);
            if (otherDedD < 0) {
                otherDedD = safe(p.getDeduction()).doubleValue() - lopD - loanRecD;
                if (otherDedD < 0) otherDedD = 0;
            }
            double overtimeD = phdDouble(phd, "overtime_pay", phdDouble(phd, "overtime", 0));
            double salAdvD   = phdDouble(phd, "salary_advance", 0);
            double bonusD    = phdDouble(phd, "bonus", 0);
            BigDecimal computedNet = safe(p.getGrossPay())
                    .subtract(BigDecimal.valueOf(lopD + loanRecD + otherDedD))
                    .add(BigDecimal.valueOf(overtimeD + salAdvD + bonusD));

            createCell(row, 0, employeeName(p),         dataStyle);
            createCell(row, 1, str(p.getStartDate()),    dataStyle);
            createCell(row, 2, str(p.getEndDate()),      dataStyle);
            createCell(row, 3, amount(p.getBasicPay()),  amtStyle);
            createCell(row, 4, amount(p.getDeduction()), amtStyle);
            createCell(row, 5, fmt(allowance),           amtStyle);
            createCell(row, 6, amount(p.getGrossPay()),  amtStyle);
            createCell(row, 7, fmt(computedNet),         amtStyle);
            createCell(row, 8, status(p),                dataStyle);

            totalNetPay = totalNetPay.add(computedNet);
            deptTotals.merge(dept.isEmpty() ? "Unknown" : dept, computedNet, BigDecimal::add);
        }

        // ═══════════════════════════════════════════════════════════════════
        // TABLE 2: Department-wise net pay totals (3 rows after table 1)
        // ═══════════════════════════════════════════════════════════════════
        int t2Start = rowNum + 3;
        sheet.createRow(rowNum);
        sheet.createRow(rowNum + 1);
        sheet.createRow(rowNum + 2);

        String[] t2Headers = {"Department", "Amount"};
        Row t2Head = sheet.createRow(t2Start);
        t2Head.setHeightInPoints(20);
        for (int c = 0; c < t2Headers.length; c++) createCell(t2Head, c, t2Headers[c], tableHeaderStyle);

        rowNum = t2Start + 1;
        if (deptTotals.isEmpty()) {
            Row row = sheet.createRow(rowNum++);
            createCell(row, 0, "None", dataStyle);
            createCell(row, 1, "0.00", amtStyle);
        } else {
            for (Map.Entry<String, BigDecimal> e : deptTotals.entrySet()) {
                Row row = sheet.createRow(rowNum++);
                createCell(row, 0, e.getKey(), dataStyle);
                createCell(row, 1, fmt(e.getValue()), amtStyle);
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // TABLE 3: Contracts ending in period (3 rows after table 2)
        // ═══════════════════════════════════════════════════════════════════
        int t3Start = rowNum + 3;
        sheet.createRow(rowNum);
        sheet.createRow(rowNum + 1);
        sheet.createRow(rowNum + 2);

        String t3ColName = (startDate != null && endDate != null)
                ? "Contract Ending " + startDate + " to " + endDate
                : "Contract Ending";
        Row t3Head = sheet.createRow(t3Start);
        t3Head.setHeightInPoints(20);
        createCell(t3Head, 0, t3ColName, tableHeaderStyle);

        rowNum = t3Start + 1;
        List<Contract> endingContracts = findEndingContracts(payslips, startDate, endDate);
        if (endingContracts.isEmpty()) {
            Row row = sheet.createRow(rowNum++);
            createCell(row, 0, "None", dataStyle);
        } else {
            for (Contract c : endingContracts) {
                Row row = sheet.createRow(rowNum++);
                createCell(row, 0, c.getContractName() != null ? c.getContractName() : "Contract #" + c.getId(), dataStyle);
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // TABLE 5: Employee-Employer contributions (3 rows after table 3)
        // ═══════════════════════════════════════════════════════════════════
        int t5Start = rowNum + 3;
        sheet.createRow(rowNum);
        sheet.createRow(rowNum + 1);
        sheet.createRow(rowNum + 2);

        String t5ColName = (startDate != null && endDate != null)
                ? "Employee - Employer Contributions " + startDate + " to " + endDate
                : "Employee - Employer Contributions";
        String[] t5Headers = {t5ColName, "Employer Contribution", "Employee Contribution"};
        Row t5Head = sheet.createRow(t5Start);
        t5Head.setHeightInPoints(20);
        for (int c = 0; c < t5Headers.length; c++) createCell(t5Head, c, t5Headers[c], tableHeaderStyle);

        rowNum = t5Start + 1;
        List<Object[]> contributions = buildContributions(payslips);
        if (contributions.isEmpty()) {
            Row row = sheet.createRow(rowNum++);
            createCell(row, 0, "None", dataStyle);
            createCell(row, 1, "0.00", amtStyle);
            createCell(row, 2, "0.00", amtStyle);
        } else {
            for (Object[] contrib : contributions) {
                Row row = sheet.createRow(rowNum++);
                createCell(row, 0, (String) contrib[0],   dataStyle);
                createCell(row, 1, fmt((BigDecimal) contrib[1]), amtStyle);
                createCell(row, 2, fmt((BigDecimal) contrib[2]), amtStyle);
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // TABLE 4: Summary stats (3 rows after table 5)
        // ═══════════════════════════════════════════════════════════════════
        int t4Start = rowNum + 3;
        sheet.createRow(rowNum);
        sheet.createRow(rowNum + 1);
        sheet.createRow(rowNum + 2);

        Row t4Head = sheet.createRow(t4Start);
        t4Head.setHeightInPoints(30);
        createCell(t4Head, 0, "Number of payslips generated", tableHeaderStyle);
        createCell(t4Head, 1, "Total Amount", tableHeaderStyle);

        Row t4Data = sheet.createRow(t4Start + 1);
        t4Data.setHeightInPoints(18);
        createCell(t4Data, 0, String.valueOf(payslips.size()), dataStyle);
        createCell(t4Data, 1, fmt(totalNetPay), amtStyle);
    }

    /** Find contracts ending within the export period, scoped to the same companies as the payslips. */
    private List<Contract> findEndingContracts(List<Payslip> payslips, LocalDate startDate, LocalDate endDate) {
        if (payslips.isEmpty()) return List.of();
        Set<Long> companyIds = payslips.stream()
                .filter(p -> p.getCompany() != null)
                .map(p -> p.getCompany().getId())
                .collect(Collectors.toSet());

        LocalDate from = startDate != null ? startDate : LocalDate.now().withDayOfMonth(1);
        LocalDate to   = endDate   != null ? endDate   : LocalDate.now();

        return contractRepository.findAll().stream()
                .filter(c -> c.getEndDate() != null
                        && !c.getEndDate().isBefore(from)
                        && !c.getEndDate().isAfter(to)
                        && c.getEmployee() != null
                        && c.getEmployee().getCompany() != null
                        && companyIds.contains(c.getEmployee().getCompany().getId()))
                .collect(Collectors.toList());
    }

    /** Extract employee-employer contributions from payHeadData deduction buckets. */
    @SuppressWarnings("unchecked")
    private List<Object[]> buildContributions(List<Payslip> payslips) {
        // Map: employeeName -> [employerContrib, employeeContrib]
        Map<String, BigDecimal[]> map = new LinkedHashMap<>();
        ObjectMapper om = new ObjectMapper();

        for (Payslip p : payslips) {
            if (p.getPayHeadData() == null || p.getPayHeadData().isBlank()) continue;
            try {
                Map<String, Object> phd = om.readValue(p.getPayHeadData(),
                        new TypeReference<Map<String, Object>>() {});
                String empName = employeeName(p);
                double empContrib = 0, erContrib = 0;

                String[] buckets = {"gross_pay_deductions","basic_pay_deductions",
                                    "pretax_deductions","post_tax_deductions","tax_deductions","net_deductions"};
                for (String bucket : buckets) {
                    Object raw = phd.get(bucket);
                    if (!(raw instanceof List)) continue;
                    for (Object item : (List<?>) raw) {
                        if (!(item instanceof Map)) continue;
                        Map<?,?> ded = (Map<?,?>) item;
                        if (ded.get("deduction_id") == null) continue;
                        double erAmt = toDouble(ded.get("employer_contribution_amount"));
                        double eeAmt = toDouble(ded.get("amount"));
                        erContrib += erAmt;
                        empContrib += eeAmt;
                    }
                }
                if (erContrib > 0) {
                    BigDecimal[] vals = map.computeIfAbsent(empName, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
                    vals[0] = vals[0].add(BigDecimal.valueOf(erContrib));
                    vals[1] = vals[1].add(BigDecimal.valueOf(empContrib));
                }
            } catch (Exception ignored) {}
        }

        return map.entrySet().stream()
                .map(e -> new Object[]{e.getKey(), e.getValue()[0], e.getValue()[1]})
                .collect(Collectors.toList());
    }

    private double toDouble(Object v) {
        if (v == null) return 0.0;
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }

    // ── Import Template (GCP payslip_import_template format) ─────────────────

    /**
     * Generate the GCP-matching import template Excel file.
     * Green columns = static (Employee Id, Employee Name, Department, Basic Salary, Housing Allowance,
     *                         Transport Allowance, Other Allowance).
     * Orange columns = variable (Total Paid Days, Gross Salary, Loss of Pay,
     *                            salary_advance_loan_recovery, Deduction, Overtime,
     *                            salary_advance, bonus, Net Salary).
     * Salary columns carry pro-rata formulas: =ROUND((base/daysInMonth)*H{row}, 2).
     */
    public byte[] exportImportTemplate(List<Employee> employees, int month, int year) throws IOException {
        int daysInMonth = YearMonth.of(year, month).lengthOfMonth();

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet sheet = wb.createSheet("Payslips");

            // Column widths
            for (int i = 0; i < 16; i++) sheet.setColumnWidth(i, 20 * 256);

            // ── Styles ────────────────────────────────────────────────────────
            XSSFCellStyle mergedHeaderStyle = wb.createCellStyle();
            mergedHeaderStyle.setAlignment(HorizontalAlignment.CENTER);
            mergedHeaderStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(mergedHeaderStyle);
            XSSFFont boldFont = wb.createFont(); boldFont.setBold(true);
            mergedHeaderStyle.setFont(boldFont);

            XSSFCellStyle greenHeader = coloredStyle(wb, new byte[]{(byte)0xD8,(byte)0xE4,(byte)0xBC}, true);
            XSSFCellStyle greenData   = coloredStyle(wb, new byte[]{(byte)0xD8,(byte)0xE4,(byte)0xBC}, false);
            XSSFCellStyle orangeHeader= coloredStyle(wb, new byte[]{(byte)0xFC,(byte)0xD5,(byte)0xB4}, true);
            XSSFCellStyle orangeData  = coloredStyle(wb, new byte[]{(byte)0xFC,(byte)0xD5,(byte)0xB4}, false);

            // ── Row 0: Merged section headers (DEDUCTION / ADDITION) ──────────
            Row row0 = sheet.createRow(0);
            row0.setHeightInPoints(20);
            for (int c = 0; c < 16; c++) createCell(row0, c, "", mergedHeaderStyle);
            // Columns 9-11 = DEDUCTION (J, K, L)
            row0.getCell(9).setCellValue("DEDUCTION");
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 9, 11));
            // Columns 12-14 = ADDITION (M, N, O)
            row0.getCell(12).setCellValue("ADDITION");
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 12, 14));

            // ── Row 1: blank spacer ───────────────────────────────────────────
            sheet.createRow(1).setHeightInPoints(5);

            // ── Row 2: Column headers ─────────────────────────────────────────
            String[] staticCols = {
                "Employee Id", "Employee Name", "Department",
                "Basic Salary", "Housing Allowance", "Transport Allowance", "Other Allowance"
            };
            String[] varCols = {
                "Total Paid Days", "Gross Salary", "Loss of Pay",
                "salary_advance_loan_recovery", "Deduction",
                "Overtime", "salary_advance", "bonus", "Net Salary"
            };

            Row headerRow = sheet.createRow(2);
            headerRow.setHeightInPoints(25);
            int col = 0;
            for (String h : staticCols) createCell(headerRow, col++, h, greenHeader);
            for (String h : varCols)   createCell(headerRow, col++, h, orangeHeader);

            // ── Data rows ─────────────────────────────────────────────────────
            int dataRow = 3;
            for (Employee emp : employees) {
                // Look up active contract for base salary values
                Contract contract = contractRepository
                        .findByEmployeeIdAndContractStatus(emp.getId(), Contract.ContractStatus.ACTIVE)
                        .orElse(null);

                double basicSalary = contract != null && contract.getWage()                != null ? contract.getWage().doubleValue()                : 0.0;
                double housing     = contract != null && contract.getHousingAllowance()    != null ? contract.getHousingAllowance().doubleValue()    : 0.0;
                double transport   = contract != null && contract.getTransportAllowance()  != null ? contract.getTransportAllowance().doubleValue()  : 0.0;
                double other       = contract != null && contract.getOtherAllowance()      != null ? contract.getOtherAllowance().doubleValue()      : 0.0;

                String dept = emp.getDepartment() != null ? emp.getDepartment().getName() : "";
                String name = trim(emp.getFirstName())
                        + (emp.getLastName() != null ? " " + emp.getLastName().trim() : "");
                String badge = emp.getBadgeId() != null ? emp.getBadgeId() : String.valueOf(emp.getId());

                Row row = sheet.createRow(dataRow);
                int excelRow = dataRow + 1; // 1-based Excel row

                // Static columns (green data)
                createCell(row, 0, badge, greenData);
                createCell(row, 1, name,  greenData);
                createCell(row, 2, dept,  greenData);

                // Basic Salary formula: =ROUND((base/daysInMonth)*H{excelRow}, 2)
                createFormulaCell(row, 3,
                    "=ROUND((" + basicSalary + "/" + daysInMonth + ")*H" + excelRow + ",2)", greenData);
                createFormulaCell(row, 4,
                    "=ROUND((" + housing    + "/" + daysInMonth + ")*H" + excelRow + ",2)", greenData);
                createFormulaCell(row, 5,
                    "=ROUND((" + transport  + "/" + daysInMonth + ")*H" + excelRow + ",2)", greenData);
                createFormulaCell(row, 6,
                    "=ROUND((" + other      + "/" + daysInMonth + ")*H" + excelRow + ",2)", greenData);

                // Variable columns (orange data)
                // H = Total Paid Days (col 7) — default to daysInMonth
                Cell paidDaysCell = row.createCell(7);
                paidDaysCell.setCellValue(daysInMonth);
                paidDaysCell.setCellStyle(orangeData);

                // I = Gross Salary: =SUM(D:G)
                createFormulaCell(row, 8, "=SUM(D" + excelRow + ":G" + excelRow + ")", orangeData);

                // J, K, L = Loss of Pay, salary_advance_loan_recovery, Deduction (user-editable numeric)
                createInputCell(row, 9,  orangeData);
                createInputCell(row, 10, orangeData);
                createInputCell(row, 11, orangeData);

                // M, N, O = Overtime, salary_advance, bonus (user-editable numeric)
                createInputCell(row, 12, orangeData);
                createInputCell(row, 13, orangeData);
                createInputCell(row, 14, orangeData);

                // P = Net Salary: =I - SUM(J:L) + SUM(M:O)
                createFormulaCell(row, 15,
                    "=I" + excelRow + "-SUM(J" + excelRow + ":L" + excelRow
                    + ")+SUM(M" + excelRow + ":O" + excelRow + ")", orangeData);

                dataRow++;
            }

            // Force-evaluate all formulas so cells show calculated values immediately
            // (not 0 cached value from POI default)
            org.apache.poi.xssf.usermodel.XSSFFormulaEvaluator.evaluateAllFormulaCells(wb);
            wb.setForceFormulaRecalculation(true);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            wb.write(baos);
            return baos.toByteArray();
        }
    }

    private XSSFCellStyle coloredStyle(XSSFWorkbook wb, byte[] rgb, boolean bold) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(rgb, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorder(style);
        if (bold) {
            XSSFFont font = wb.createFont();
            font.setBold(true);
            style.setFont(font);
        }
        return style;
    }

    private void createFormulaCell(Row row, int col, String formula, CellStyle style) {
        Cell cell = row.createCell(col);
        // POI 5.x setCellFormula must NOT include the leading '='
        cell.setCellFormula(formula.startsWith("=") ? formula.substring(1) : formula);
        cell.setCellStyle(style);
    }

    /** Creates a blank NUMERIC cell so Excel treats user-entered values as numbers (not text). */
    private void createInputCell(Row row, int col, CellStyle style) {
        Cell cell = row.createCell(col, CellType.BLANK);
        cell.setCellStyle(style);
    }

    // ── Style helpers ─────────────────────────────────────────────────────────

    private CellStyle headerStyle(XSSFWorkbook wb, byte[] rgb) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(rgb, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorder(style);
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setColor(new XSSFColor(new byte[]{(byte)0xFF, (byte)0xFF, (byte)0xFF}, null));
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        return style;
    }

    private CellStyle sectionStyle(XSSFWorkbook wb, byte[] rgb) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(rgb, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorder(style);
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setColor(new XSSFColor(new byte[]{(byte)0xFF, (byte)0xFF, (byte)0xFF}, null));
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        return style;
    }

    private CellStyle subHeaderStyle(XSSFWorkbook wb) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(new byte[]{(byte)0xD9, (byte)0xD9, (byte)0xD9}, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorder(style);
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 10);
        style.setFont(font);
        return style;
    }

    private CellStyle dataStyle(XSSFWorkbook wb, byte[] rgb) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(rgb, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorder(style);
        return style;
    }

    private CellStyle plainDataStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorder(style);
        return style;
    }

    private CellStyle amountDataStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorder(style);
        return style;
    }

    private CellStyle boldAmountStyle(XSSFWorkbook wb) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(new byte[]{(byte)0xF2, (byte)0xF2, (byte)0xF2}, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        setBorder(style);
        XSSFFont font = wb.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private void setBorder(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    // ── Cell creation ─────────────────────────────────────────────────────────

    private void createCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    // ── Data helpers ──────────────────────────────────────────────────────────

    private String employeeCode(Payslip p) {
        if (p.getEmployee() == null) return "";
        String badge = p.getEmployee().getBadgeId();
        return badge != null ? badge : String.valueOf(p.getEmployee().getId());
    }

    private String employeeName(Payslip p) {
        if (p.getEmployee() == null) return "";
        String first = p.getEmployee().getFirstName();
        String last  = p.getEmployee().getLastName();
        return trim(first) + (last != null ? " " + last.trim() : "");
    }

    private String department(Payslip p) {
        try {
            if (p.getEmployee() != null && p.getEmployee().getDepartment() != null) {
                return p.getEmployee().getDepartment().getName();
            }
        } catch (Exception ignored) {}
        return "";
    }

    private String status(Payslip p) {
        return p.getStatus() != null ? p.getStatus().name() : "DRAFT";
    }

    private String amount(BigDecimal val) {
        return fmt(val);
    }

    private String fmt(BigDecimal val) {
        return val != null ? val.setScale(2, RoundingMode.HALF_UP).toPlainString() : "0.00";
    }

    private BigDecimal safe(BigDecimal val) {
        return val != null ? val : BigDecimal.ZERO;
    }

    private String str(Object val) {
        return val != null ? val.toString() : "";
    }

    private String trim(String s) {
        return s != null ? s.trim() : "";
    }
}
