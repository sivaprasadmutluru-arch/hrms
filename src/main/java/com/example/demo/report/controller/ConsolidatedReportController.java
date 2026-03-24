package com.example.demo.report.controller;

import com.example.demo.report.service.ConsolidatedReportService;
import com.example.demo.report.util.ExcelExporter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Consolidated reports for ENTERPRISE_ADMIN and HEAD_OFFICE users.
 * These endpoints aggregate data across all accessible companies (branches).
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Consolidated Reports")
public class ConsolidatedReportController {

    private final ConsolidatedReportService reportService;
    private final ExcelExporter excelExporter;

    @GetMapping("/headcount")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Headcount snapshot across accessible companies")
    public ResponseEntity<Map<String, Object>> headcount() {
        return ResponseEntity.ok(reportService.headcountSummary());
    }

    @GetMapping("/attendance")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Attendance summary for a date range")
    public ResponseEntity<Map<String, Object>> attendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate resolvedFrom = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate resolvedTo = to != null ? to : LocalDate.now();
        return ResponseEntity.ok(reportService.attendanceSummary(resolvedFrom, resolvedTo));
    }

    @GetMapping("/leave")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Leave summary for a date range")
    public ResponseEntity<Map<String, Object>> leave(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate resolvedFrom = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate resolvedTo = to != null ? to : LocalDate.now();
        return ResponseEntity.ok(reportService.leaveSummary(resolvedFrom, resolvedTo));
    }

    @GetMapping("/payroll")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT')")
    @Operation(summary = "Payroll summary for a date range")
    public ResponseEntity<Map<String, Object>> payroll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate resolvedFrom = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate resolvedTo = to != null ? to : LocalDate.now();
        return ResponseEntity.ok(reportService.payrollSummary(resolvedFrom, resolvedTo));
    }

    @GetMapping("/pending-approvals")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Operation(summary = "Pending approvals summary: leave, attendance, payslips awaiting action")
    public ResponseEntity<Map<String, Object>> pendingApprovals() {
        return ResponseEntity.ok(reportService.pendingApprovalsSummary());
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT')")
    @Operation(summary = "Export report as Excel (.xlsx). type = attendance | leave | payroll")
    public ResponseEntity<byte[]> export(
            @RequestParam String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        LocalDate resolvedFrom = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate resolvedTo = to != null ? to : LocalDate.now();

        List<Map<String, Object>> data = reportService.getExportData(type, resolvedFrom, resolvedTo);
        byte[] bytes = excelExporter.buildSheet(type, data);

        String filename = type + "_report_" + resolvedFrom + "_to_" + resolvedTo + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }
}
