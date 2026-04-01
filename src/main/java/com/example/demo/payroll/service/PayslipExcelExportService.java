package com.example.demo.payroll.service;

import com.example.demo.payroll.entity.Payslip;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
public class PayslipExcelExportService {

    public byte[] exportPayslips(List<Payslip> payslips) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            buildSummarySheet(workbook, payslips);
            buildDetailedSheet(workbook, payslips);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        }
    }

    // ── Sheet 1: Summary ─────────────────────────────────────────────────────

    private void buildSummarySheet(XSSFWorkbook wb, List<Payslip> payslips) {
        XSSFSheet sheet = wb.createSheet("Summary");

        // Column widths (units: 1/256th of a character)
        int[] widths = {14, 24, 18, 20, 14, 14, 14, 16, 16, 14, 14, 16, 14, 14};
        for (int i = 0; i < widths.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }

        // Styles
        CellStyle infoHeaderStyle  = headerStyle(wb, new byte[]{(byte)0x70, (byte)0xAD, (byte)0x47}); // green
        CellStyle payHeaderStyle   = headerStyle(wb, new byte[]{(byte)0x4F, (byte)0x81, (byte)0xBD}); // blue
        CellStyle infoDataStyle    = dataStyle(wb, new byte[]{(byte)0xEB, (byte)0xF1, (byte)0xDE});   // light green
        CellStyle payDataStyle     = dataStyle(wb, new byte[]{(byte)0xDC, (byte)0xE6, (byte)0xF1});   // light blue
        CellStyle statusDataStyle  = dataStyle(wb, new byte[]{(byte)0xFF, (byte)0xF2, (byte)0xCC});   // light yellow

        // Header row
        String[] headers = {
            "Employee ID", "Employee Name", "Group / Batch", "Department",
            "Start Date", "End Date",
            "Basic Pay", "Housing Allow.", "Transport Allow.", "Other Allow.",
            "Gross Pay", "Total Deductions", "Net Pay",
            "Status"
        };
        Row headerRow = sheet.createRow(0);
        headerRow.setHeightInPoints(22);

        for (int col = 0; col < headers.length; col++) {
            CellStyle style = col < 6 ? infoHeaderStyle : payHeaderStyle;
            createCell(headerRow, col, headers[col], style);
        }

        // Data rows
        int rowNum = 1;
        for (Payslip p : payslips) {
            Row row = sheet.createRow(rowNum++);
            row.setHeightInPoints(18);

            createCell(row, 0,  employeeCode(p),         infoDataStyle);
            createCell(row, 1,  employeeName(p),          infoDataStyle);
            createCell(row, 2,  str(p.getGroupName()),    infoDataStyle);
            createCell(row, 3,  department(p),            infoDataStyle);
            createCell(row, 4,  str(p.getStartDate()),    infoDataStyle);
            createCell(row, 5,  str(p.getEndDate()),      infoDataStyle);
            createCell(row, 6,  amount(p.getBasicPay()),          payDataStyle);
            createCell(row, 7,  amount(p.getHousingAllowance()),  payDataStyle);
            createCell(row, 8,  amount(p.getTransportAllowance()),payDataStyle);
            createCell(row, 9,  amount(p.getOtherAllowance()),    payDataStyle);
            createCell(row, 10, amount(p.getGrossPay()),          payDataStyle);
            createCell(row, 11, amount(p.getDeduction()),         payDataStyle);
            createCell(row, 12, amount(p.getNetPay()),            payDataStyle);
            createCell(row, 13, status(p),                        statusDataStyle);
        }

        sheet.createFreezePane(0, 1);
    }

    // ── Sheet 2: Detailed (with merged section headers) ───────────────────────

    private void buildDetailedSheet(XSSFWorkbook wb, List<Payslip> payslips) {
        XSSFSheet sheet = wb.createSheet("Detailed");

        // Section colours
        CellStyle empSectionStyle  = sectionStyle(wb, new byte[]{(byte)0x17, (byte)0x37, (byte)0x5E}); // dark blue
        CellStyle periodStyle      = sectionStyle(wb, new byte[]{(byte)0x37, (byte)0x56, (byte)0x23}); // dark green
        CellStyle allowStyle       = sectionStyle(wb, new byte[]{(byte)0x1F, (byte)0x49, (byte)0x7D}); // medium blue
        CellStyle deductStyle      = sectionStyle(wb, new byte[]{(byte)0x92, (byte)0x24, (byte)0x00}); // dark red
        CellStyle netPayStyle      = sectionStyle(wb, new byte[]{(byte)0x3F, (byte)0x3F, (byte)0x3F}); // dark grey

        CellStyle subHeaderStyle   = subHeaderStyle(wb);
        CellStyle dataStyle        = plainDataStyle(wb);
        CellStyle amtDataStyle     = amountDataStyle(wb);
        CellStyle boldAmtStyle     = boldAmountStyle(wb);

        // Column layout:
        // 0:EmpID | 1:Name | 2:Dept | 3:StartDate | 4:EndDate
        // 5:BasicPay | 6:Housing | 7:Transport | 8:OtherAllow
        // 9:TotalDeductions | 10:NetPay

        int[] widths = {14, 24, 20, 14, 14, 14, 16, 16, 14, 16, 14};
        for (int i = 0; i < widths.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }

        // Row 0: merged section headers
        Row sectionRow = sheet.createRow(0);
        sectionRow.setHeightInPoints(22);

        createCell(sectionRow, 0, "Employee Details", empSectionStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 2));
        createCell(sectionRow, 1, "", empSectionStyle);
        createCell(sectionRow, 2, "", empSectionStyle);

        createCell(sectionRow, 3, "Pay Period", periodStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 3, 4));
        createCell(sectionRow, 4, "", periodStyle);

        createCell(sectionRow, 5, "Allowances", allowStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 5, 8));
        createCell(sectionRow, 6, "", allowStyle);
        createCell(sectionRow, 7, "", allowStyle);
        createCell(sectionRow, 8, "", allowStyle);

        createCell(sectionRow, 9,  "Deductions", deductStyle);
        createCell(sectionRow, 10, "Net Pay",    netPayStyle);

        // Row 1: column sub-headers
        Row subRow = sheet.createRow(1);
        subRow.setHeightInPoints(18);
        String[] subHeaders = {
            "Employee ID", "Employee Name", "Department",
            "Start Date", "End Date",
            "Basic Pay", "Housing", "Transport", "Other",
            "Total Deductions", "Net Pay"
        };
        for (int col = 0; col < subHeaders.length; col++) {
            createCell(subRow, col, subHeaders[col], subHeaderStyle);
        }

        // Data rows
        int rowNum = 2;
        BigDecimal totBasic = BigDecimal.ZERO, totHousing = BigDecimal.ZERO,
                   totTransport = BigDecimal.ZERO, totOther = BigDecimal.ZERO,
                   totDeductions = BigDecimal.ZERO, totNetPay = BigDecimal.ZERO;

        for (Payslip p : payslips) {
            Row row = sheet.createRow(rowNum++);
            row.setHeightInPoints(18);

            createCell(row, 0,  employeeCode(p),                  dataStyle);
            createCell(row, 1,  employeeName(p),                   dataStyle);
            createCell(row, 2,  department(p),                     dataStyle);
            createCell(row, 3,  str(p.getStartDate()),             dataStyle);
            createCell(row, 4,  str(p.getEndDate()),               dataStyle);
            createCell(row, 5,  amount(p.getBasicPay()),           amtDataStyle);
            createCell(row, 6,  amount(p.getHousingAllowance()),   amtDataStyle);
            createCell(row, 7,  amount(p.getTransportAllowance()), amtDataStyle);
            createCell(row, 8,  amount(p.getOtherAllowance()),     amtDataStyle);
            createCell(row, 9,  amount(p.getDeduction()),          amtDataStyle);
            createCell(row, 10, amount(p.getNetPay()),             amtDataStyle);

            totBasic      = totBasic.add(safe(p.getBasicPay()));
            totHousing    = totHousing.add(safe(p.getHousingAllowance()));
            totTransport  = totTransport.add(safe(p.getTransportAllowance()));
            totOther      = totOther.add(safe(p.getOtherAllowance()));
            totDeductions = totDeductions.add(safe(p.getDeduction()));
            totNetPay     = totNetPay.add(safe(p.getNetPay()));
        }

        // Totals row
        Row totalsRow = sheet.createRow(rowNum);
        totalsRow.setHeightInPoints(22);
        createCell(totalsRow, 0,  "TOTALS", subHeaderStyle);
        createCell(totalsRow, 1,  "",        subHeaderStyle);
        createCell(totalsRow, 2,  "",        subHeaderStyle);
        createCell(totalsRow, 3,  "",        subHeaderStyle);
        createCell(totalsRow, 4,  "",        subHeaderStyle);
        createCell(totalsRow, 5,  fmt(totBasic),      boldAmtStyle);
        createCell(totalsRow, 6,  fmt(totHousing),    boldAmtStyle);
        createCell(totalsRow, 7,  fmt(totTransport),  boldAmtStyle);
        createCell(totalsRow, 8,  fmt(totOther),      boldAmtStyle);
        createCell(totalsRow, 9,  fmt(totDeductions), boldAmtStyle);
        createCell(totalsRow, 10, fmt(totNetPay),     boldAmtStyle);

        sheet.createFreezePane(0, 2);
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
