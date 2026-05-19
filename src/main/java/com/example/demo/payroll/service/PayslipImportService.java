package com.example.demo.payroll.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.payroll.entity.Payslip;
import com.example.demo.payroll.repository.PayslipRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayslipImportService {

    private final PayslipRepository payslipRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final ObjectMapper objectMapper;

    /**
     * Returns month grid data for the import info page (mirrors GCP payslip_import_info).
     * Each month has: month_num, month_name, year, status ("completed"/"pending"), date_range.
     */
    public List<Map<String, Object>> getImportInfo(Long companyId, int year) {
        List<Map<String, Object>> monthsData = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            LocalDate monthStart = LocalDate.of(year, m, 1);
            LocalDate monthEnd   = YearMonth.of(year, m).atEndOfMonth();

            long count = payslipRepository.findByCompanyId(companyId).stream()
                    .filter(p -> p.getStartDate() != null && p.getEndDate() != null
                            && !p.getStartDate().isBefore(monthStart)
                            && !p.getEndDate().isAfter(monthEnd))
                    .count();

            Map<String, Object> monthData = new LinkedHashMap<>();
            monthData.put("month_num",  m);
            monthData.put("month_name", monthStart.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH));
            monthData.put("year",       year);
            monthData.put("status",     count > 0 ? "completed" : "pending");
            monthData.put("date_range", monthStart.format(java.time.format.DateTimeFormatter.ofPattern("MMM dd"))
                    + " - " + monthEnd.format(java.time.format.DateTimeFormatter.ofPattern("MMM dd")));
            monthData.put("payslips_count", count);
            monthsData.add(monthData);
        }
        return monthsData;
    }

    /**
     * Process the uploaded Excel/CSV file and create/update payslips.
     * Mirrors GCP payslip_import_process.
     *
     * Expected columns (case-insensitive, spaces → underscores):
     *   Employee Id, Employee Name, Department, Basic Salary, Housing Allowance,
     *   Transport Allowance, Other Allowance, Total Paid Days, Gross Salary,
     *   Loss of Pay, salary_advance_loan_recovery, Deduction, Overtime,
     *   salary_advance, bonus, Net Salary
     *
     * Net Pay = (Gross Pay + Overtime + salary_advance + bonus)
     *          - (Loss of Pay + salary_advance_loan_recovery + Deduction)
     */
    @Transactional
    public Map<String, Object> processImport(Long companyId, int month, int year, MultipartFile file)
            throws IOException {

        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate   = YearMonth.of(year, month).atEndOfMonth();

        // ── Read workbook ─────────────────────────────────────────────────────
        Workbook workbook = WorkbookFactory.create(file.getInputStream());
        Sheet sheet = workbook.getSheetAt(0);

        // ── Detect header row (row 0 or row 2 for template format) ────────────
        int headerRowIndex = detectHeaderRow(sheet);

        // ── Read headers ──────────────────────────────────────────────────────
        Row headerRow = sheet.getRow(headerRowIndex);
        if (headerRow == null) {
            workbook.close();
            return errorResult("Empty or invalid file: no header row found.");
        }

        Map<String, Integer> colIndex = buildColumnIndex(headerRow);

        Integer empIdCol = findColumn(colIndex, "employee_id", "employeeid", "emp_id", "badge_id", "badgeid");
        if (empIdCol == null) {
            workbook.close();
            return errorResult("Missing required column: 'Employee Id'. Found: " + colIndex.keySet());
        }

        // ── Process rows ──────────────────────────────────────────────────────
        List<String> errors = new ArrayList<>();
        int imported = 0;

        for (int rowIdx = headerRowIndex + 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
            Row row = sheet.getRow(rowIdx);
            if (row == null) continue;

            try {
                String badgeId = cellString(row, empIdCol);
                if (badgeId == null || badgeId.isBlank() || badgeId.equalsIgnoreCase("nan")) continue;

                // Skip label rows from multi-sheet templates
                if (badgeId.toLowerCase().contains("static") || badgeId.toLowerCase().contains("variable")) continue;

                // Find employee — try scoped lookup first, then cross-company, then by DB id
                Optional<Employee> empOpt = employeeRepository.findByBadgeIdAndCompanyId(badgeId, companyId);
                if (empOpt.isEmpty()) {
                    // Try without company restriction (covers multi-branch scenarios where the employee
                    // belongs to a child/branch company but payslip is attached to the parent company)
                    empOpt = employeeRepository.findByBadgeId(badgeId);
                }
                if (empOpt.isEmpty()) {
                    // Last resort: if badge value is a plain number, try matching by DB primary key
                    try {
                        Long dbId = Long.parseLong(badgeId);
                        empOpt = employeeRepository.findById(dbId);
                    } catch (NumberFormatException ignored) {}
                }
                if (empOpt.isEmpty()) {
                    errors.add("Row " + (rowIdx + 1) + ": Employee with badge ID '" + badgeId + "' not found.");
                    continue;
                }
                Employee employee = empOpt.get();

                // ── Read values from row ──────────────────────────────────────
                double monthlyBasicPay = cellDouble(row, colIndex, "basic_salary", "basic_pay", "wage");
                double housing         = cellDouble(row, colIndex, "housing_allowance");
                double transport       = cellDouble(row, colIndex, "transport_allowance");
                double other           = cellDouble(row, colIndex, "other_allowance");
                double paidDays        = cellDouble(row, colIndex, "total_paid_days");
                double grossPayExcel   = cellDouble(row, colIndex, "gross_salary", "gross_pay");
                double lossOfPay       = cellDouble(row, colIndex, "loss_of_pay", "lop");
                double salAdvLoanRec   = cellDouble(row, colIndex, "salary_advance_loan_recovery");
                double deductionAmt    = cellDouble(row, colIndex, "deduction");
                double overtime        = cellDouble(row, colIndex, "overtime");
                double salaryAdvance   = cellDouble(row, colIndex, "salary_advance");
                double bonus           = cellDouble(row, colIndex, "bonus");

                // ── Calculate gross pay ───────────────────────────────────────
                double grossPay = grossPayExcel > 0
                        ? grossPayExcel
                        : monthlyBasicPay + housing + transport + other;

                // ── Net Pay formula (GCP formula) ─────────────────────────────
                double netPay = round2(
                        (grossPay + overtime + salaryAdvance + bonus)
                        - (lossOfPay + salAdvLoanRec + deductionAmt));

                double totalDeductions = round2(lossOfPay + salAdvLoanRec + deductionAmt);

                // ── Build pay_head_data ───────────────────────────────────────
                Map<String, Object> payHeadData = new LinkedHashMap<>();
                payHeadData.put("paid_days",                     round2(paidDays));
                payHeadData.put("loss_of_pay",                   round2(lossOfPay));
                payHeadData.put("basic_pay",                     round2(monthlyBasicPay));
                payHeadData.put("housing_allowance",             round2(housing));
                payHeadData.put("transport_allowance",           round2(transport));
                payHeadData.put("other_allowance",               round2(other));
                payHeadData.put("salary_advance_loan_recovery",  round2(salAdvLoanRec));
                payHeadData.put("deduction",                     round2(deductionAmt));
                payHeadData.put("salary_advance",                round2(salaryAdvance));
                payHeadData.put("bonus",                         round2(bonus));
                payHeadData.put("overtime",                      round2(overtime));
                payHeadData.put("total_deductions",              round2(totalDeductions));
                payHeadData.put("gross_pay",                     round2(grossPay));
                payHeadData.put("net_pay",                       round2(netPay));
                payHeadData.put("contract_wage",                 round2(monthlyBasicPay));
                payHeadData.put("monthly_basic_pay",             round2(monthlyBasicPay));
                payHeadData.put("is_imported",                   true);
                payHeadData.put("allowances",                    List.of());
                payHeadData.put("pretax_deductions",             List.of());
                payHeadData.put("post_tax_deductions",           List.of());
                payHeadData.put("tax_deductions",                List.of());
                payHeadData.put("net_deductions",                List.of());
                payHeadData.put("basic_pay_deductions",          List.of());
                payHeadData.put("gross_pay_deductions",          List.of());
                payHeadData.put("start_date",                    startDate.toString());
                payHeadData.put("end_date",                      endDate.toString());

                String payHeadJson = objectMapper.writeValueAsString(payHeadData);

                // ── Create or update payslip ──────────────────────────────────
                List<Payslip> existing = payslipRepository.findByEmployeeIdAndStartDateBetween(
                        employee.getId(), startDate, startDate);

                if (!existing.isEmpty()) {
                    Payslip p = existing.get(0);
                    p.setContractWage(BigDecimal.valueOf(round2(monthlyBasicPay)));
                    p.setBasicPay(BigDecimal.valueOf(round2(monthlyBasicPay)));
                    p.setGrossPay(BigDecimal.valueOf(round2(grossPay)));
                    p.setHousingAllowance(BigDecimal.valueOf(round2(housing)));
                    p.setTransportAllowance(BigDecimal.valueOf(round2(transport)));
                    p.setOtherAllowance(BigDecimal.valueOf(round2(other)));
                    p.setDeduction(BigDecimal.valueOf(round2(totalDeductions)));
                    p.setNetPay(BigDecimal.valueOf(round2(netPay)));
                    p.setPayHeadData(payHeadJson);
                    if (p.getStatus() != Payslip.PayslipStatus.PAID) {
                        p.setStatus(Payslip.PayslipStatus.DRAFT);
                    }
                    payslipRepository.save(p);
                } else {
                    Payslip p = new Payslip();
                    p.setEmployee(employee);
                    p.setStartDate(startDate);
                    p.setEndDate(endDate);
                    p.setPayDate(endDate);
                    p.setContractWage(BigDecimal.valueOf(round2(monthlyBasicPay)));
                    p.setBasicPay(BigDecimal.valueOf(round2(monthlyBasicPay)));
                    p.setGrossPay(BigDecimal.valueOf(round2(grossPay)));
                    p.setHousingAllowance(BigDecimal.valueOf(round2(housing)));
                    p.setTransportAllowance(BigDecimal.valueOf(round2(transport)));
                    p.setOtherAllowance(BigDecimal.valueOf(round2(other)));
                    p.setDeduction(BigDecimal.valueOf(round2(totalDeductions)));
                    p.setNetPay(BigDecimal.valueOf(round2(netPay)));
                    p.setStatus(Payslip.PayslipStatus.DRAFT);
                    p.setPayHeadData(payHeadJson);
                    p.setCompany(companyRepository.getReferenceById(companyId));
                    payslipRepository.save(p);
                }
                imported++;

            } catch (Exception e) {
                log.warn("Import row {} failed: {}", rowIdx + 1, e.getMessage());
                errors.add("Row " + (rowIdx + 1) + ": " + e.getMessage());
            }
        }
        workbook.close();

        Map<String, Object> result = new LinkedHashMap<>();
        if (!errors.isEmpty()) {
            result.put("status",   "partial");
            result.put("message",  "Import completed with " + errors.size() + " error(s).");
            result.put("errors",   errors.subList(0, Math.min(errors.size(), 20)));
        } else {
            result.put("status",  "success");
            result.put("message", "Successfully imported " + imported + " payslip(s) for "
                    + LocalDate.of(year, month, 1).getMonth()
                            .getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + year + ".");
        }
        result.put("imported", imported);
        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private int detectHeaderRow(Sheet sheet) {
        Row row0 = sheet.getRow(0);
        if (row0 != null) {
            String joined = rowTextJoined(row0).toUpperCase();
            if (joined.contains("DEDUCTION") || joined.contains("ADDITION")) {
                // Template format — headers are on row 2
                Row row2 = sheet.getRow(2);
                if (row2 != null) {
                    String r2text = rowTextJoined(row2).toUpperCase();
                    if (r2text.contains("EMPLOYEE") || r2text.contains("BASIC")) return 2;
                }
            }
        }
        return 0;
    }

    private String rowTextJoined(Row row) {
        StringBuilder sb = new StringBuilder();
        for (Cell cell : row) {
            String v = cellToString(cell);
            if (v != null && !v.isBlank()) sb.append(v).append(" ");
        }
        return sb.toString();
    }

    private Map<String, Integer> buildColumnIndex(Row headerRow) {
        Map<String, Integer> index = new LinkedHashMap<>();
        for (Cell cell : headerRow) {
            String raw = cellToString(cell);
            if (raw != null && !raw.isBlank()) {
                String normalized = raw.trim().toLowerCase()
                        .replace(" ", "_").replace("-", "_");
                index.put(normalized, cell.getColumnIndex());
            }
        }
        return index;
    }

    private Integer findColumn(Map<String, Integer> colIndex, String... candidates) {
        for (String c : candidates) {
            if (colIndex.containsKey(c)) return colIndex.get(c);
        }
        return null;
    }

    private double cellDouble(Row row, Map<String, Integer> colIndex, String... candidates) {
        for (String c : candidates) {
            Integer idx = colIndex.get(c);
            if (idx != null) {
                Cell cell = row.getCell(idx);
                if (cell == null) continue;
                if (cell.getCellType() == CellType.NUMERIC) return cell.getNumericCellValue();
                if (cell.getCellType() == CellType.FORMULA) {
                    try { return cell.getNumericCellValue(); } catch (Exception ignored) {}
                }
                String s = cellToString(cell);
                if (s != null && !s.isBlank()) {
                    try { return Double.parseDouble(s.trim()); } catch (NumberFormatException ignored) {}
                }
            }
        }
        return 0.0;
    }

    private String cellString(Row row, int colIdx) {
        Cell cell = row.getCell(colIdx);
        if (cell == null) return null;
        String s = cellToString(cell);
        return s == null ? null : s.trim();
    }

    private String cellToString(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                if (d == Math.floor(d) && !Double.isInfinite(d)) yield String.valueOf((long) d);
                yield String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try { yield String.valueOf(cell.getNumericCellValue()); }
                catch (Exception e) {
                    try { yield cell.getStringCellValue(); }
                    catch (Exception ignored) { yield null; }
                }
            }
            default -> null;
        };
    }

    private double round2(double val) {
        return Math.round(val * 100.0) / 100.0;
    }

    private Map<String, Object> errorResult(String message) {
        return Map.of("status", "error", "message", message, "imported", 0);
    }
}
