package com.example.demo.report.controller;

import com.example.demo.asset.entity.Asset;
import com.example.demo.asset.repository.AssetRepository;
import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.repository.LeaveRequestRepository;
import com.example.demo.payroll.entity.Payslip;
import com.example.demo.payroll.repository.PayslipRepository;
import com.example.demo.recruitment.entity.RecruitmentPost;
import com.example.demo.recruitment.repository.ApplicantRepository;
import com.example.demo.recruitment.repository.RecruitmentPostRepository;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.payroll.service.PayslipExcelExportService;
import com.example.demo.report.entity.GeneratedReport;
import com.example.demo.report.service.ConsolidatedReportService;
import com.example.demo.report.service.ReportRepositoryService;
import com.example.demo.report.util.ExcelExporter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
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
    private final PayslipExcelExportService payslipExcelExportService;
    private final AttendanceRepository attendanceRepository;
    private final com.example.demo.attendance.service.EmployeeAttendancePolicyService attendancePolicies;
    private final LeaveRequestRepository leaveRequestRepository;
    private final PayslipRepository payslipRepository;
    private final RecruitmentPostRepository recruitmentPostRepository;
    private final ApplicantRepository applicantRepository;
    private final AssetRepository assetRepository;
    private final ReportRepositoryService reportRepositoryService;

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
    @Transactional(readOnly = true)
    @Operation(summary = "Export report as Excel (.xlsx). type = attendance | leave | payroll")
    public ResponseEntity<byte[]> export(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long companyId) throws Exception {

        LocalDate resolvedFrom = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate resolvedTo   = to   != null ? to   : LocalDate.now();

        byte[] bytes;
        if ("payroll".equalsIgnoreCase(type)) {
            // Use the same GCP-format green/orange export (one sheet per company)
            var spec = ScopeFilter.<Payslip>byCompany();
            List<Payslip> payslips = spec != null
                    ? payslipRepository.findAll(spec)
                    : payslipRepository.findAll();
            payslips = payslips.stream()
                    .filter(p -> p.getStartDate() != null
                            && !p.getStartDate().isBefore(resolvedFrom)
                            && !p.getStartDate().isAfter(resolvedTo))
                    .toList();
            bytes = payslipExcelExportService.exportPayslips(payslips, resolvedFrom, resolvedTo);
        } else {
            List<Map<String, Object>> data = reportService.getExportData(type, resolvedFrom, resolvedTo);
            bytes = excelExporter.buildSheet(type, data);
        }

        if (companyId != null) {
            GeneratedReport.ReportType reportType = mapExportType(type);
            if (reportType != null) {
                reportRepositoryService.recordExistingExport(reportType, resolvedFrom, resolvedTo,
                        companyId, bytes, principal.getId(), principal.getUsername());
            }
        }

        String filename = type + "_report_" + resolvedFrom + "_to_" + resolvedTo + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    private GeneratedReport.ReportType mapExportType(String type) {
        if (type == null) return null;
        return switch (type.toLowerCase()) {
            case "attendance" -> GeneratedReport.ReportType.ATTENDANCE;
            case "leave" -> GeneratedReport.ReportType.LEAVE;
            case "payroll" -> GeneratedReport.ReportType.PAYROLL;
            default -> null;
        };
    }

    // ─── Dashboard Endpoints ───────────────────────────────────────────────────

    @GetMapping("/attendance-dashboard")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "Attendance dashboard KPIs for today")
    public ResponseEntity<Map<String, Object>> attendanceDashboard(@RequestParam(required = false) Long companyId) {
        LocalDate today = LocalDate.now();
        var attSpec = ScopeFilter.<Attendance>byCompany();
        List<Attendance> all = attSpec != null ? attendanceRepository.findAll(attSpec) : attendanceRepository.findAll();
        List<Attendance> todayRecords = all.stream()
                .filter(a -> today.equals(a.getAttendanceDate()))
                .toList();
        var policy = attendancePolicies.indexByCompany(todayRecords.stream().map(Attendance::getEmployee).toList(), today);
        todayRecords = todayRecords.stream().filter(record -> record.getEmployee() != null && record.getEmployee().getCompany() != null
                && policy.get(record.getEmployee().getCompany().getId()).required(record.getEmployee().getId(), today)).toList();
        long clockedInToday = todayRecords.stream()
                .map(a -> a.getEmployee() != null ? a.getEmployee().getId() : null)
                .filter(id -> id != null)
                .distinct()
                .count();
        long lateEmployees = todayRecords.stream()
                .filter(a -> a.getCheckIn() != null && a.getCheckIn().isAfter(java.time.LocalTime.of(9, 0)))
                .map(a -> a.getEmployee() != null ? a.getEmployee().getId() : null)
                .filter(id -> id != null)
                .distinct()
                .count();
        Map<String, Object> result = new HashMap<>();
        result.put("totalAttendanceToday", todayRecords.size());
        result.put("employeesClockedInToday", clockedInToday);
        result.put("lateEmployees", lateEmployees);
        result.put("date", today);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/leave-dashboard")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "Leave dashboard KPIs for current month")
    public ResponseEntity<Map<String, Object>> leaveDashboard(@RequestParam(required = false) Long companyId) {
        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate endOfMonth = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
        var leaveSpec = ScopeFilter.<LeaveRequest>byCompany();
        List<LeaveRequest> all = leaveSpec != null ? leaveRequestRepository.findAll(leaveSpec) : leaveRequestRepository.findAll();
        List<LeaveRequest> monthRequests = all.stream()
                .filter(r -> r.getStartDate() != null
                        && !r.getStartDate().isBefore(startOfMonth)
                        && !r.getStartDate().isAfter(endOfMonth))
                .toList();
        long pending = monthRequests.stream()
                .filter(r -> LeaveRequest.LeaveStatus.REQUESTED.equals(r.getStatus()))
                .count();
        long approved = monthRequests.stream()
                .filter(r -> LeaveRequest.LeaveStatus.APPROVED.equals(r.getStatus()))
                .count();
        Map<String, Object> result = new HashMap<>();
        result.put("totalLeaveRequests", monthRequests.size());
        result.put("pendingRequests", pending);
        result.put("approvedRequests", approved);
        result.put("month", startOfMonth.getMonth().toString());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/payroll-dashboard")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT')")
    @Transactional(readOnly = true)
    @Operation(summary = "Payroll dashboard KPIs for current month")
    public ResponseEntity<Map<String, Object>> payrollDashboard(@RequestParam(required = false) Long companyId) {
        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate endOfMonth = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
        var paySpec = ScopeFilter.<Payslip>byCompany();
        List<Payslip> all = paySpec != null ? payslipRepository.findAll(paySpec) : payslipRepository.findAll();
        List<Payslip> monthPayslips = all.stream()
                .filter(p -> p.getStartDate() != null
                        && !p.getStartDate().isBefore(startOfMonth)
                        && !p.getStartDate().isAfter(endOfMonth))
                .toList();
        long confirmed = monthPayslips.stream()
                .filter(p -> Payslip.PayslipStatus.CONFIRMED.equals(p.getStatus()))
                .count();
        long paid = monthPayslips.stream()
                .filter(p -> Payslip.PayslipStatus.PAID.equals(p.getStatus()))
                .count();
        double totalAmount = monthPayslips.stream()
                .filter(p -> p.getNetPay() != null)
                .mapToDouble(p -> p.getNetPay().doubleValue())
                .sum();
        Map<String, Object> result = new HashMap<>();
        result.put("totalPayslips", monthPayslips.size());
        result.put("confirmedPayslips", confirmed);
        result.put("paidPayslips", paid);
        result.put("totalNetAmount", totalAmount);
        result.put("month", startOfMonth.getMonth().toString());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/recruitment-dashboard")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "Recruitment dashboard KPIs")
    public ResponseEntity<Map<String, Object>> recruitmentDashboard(@RequestParam(required = false) Long companyId) {
        var postSpec = ScopeFilter.<RecruitmentPost>byCompany();
        List<RecruitmentPost> posts = postSpec != null ? recruitmentPostRepository.findAll(postSpec) : recruitmentPostRepository.findAll();
        long activePosts = posts.stream()
                .filter(p -> RecruitmentPost.RecruitmentStatus.OPEN.equals(p.getStatus()))
                .count();
        var applicantSpec = ScopeFilter.<com.example.demo.recruitment.entity.Applicant>byCompany();
        long totalApplicants = applicantSpec != null ? applicantRepository.findAll(applicantSpec).size() : applicantRepository.count();
        Map<String, Object> result = new HashMap<>();
        result.put("totalPosts", posts.size());
        result.put("activePosts", activePosts);
        result.put("totalApplicants", totalApplicants);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/asset-dashboard")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "Asset dashboard KPIs")
    public ResponseEntity<Map<String, Object>> assetDashboard(@RequestParam(required = false) Long companyId) {
        var assetSpec = ScopeFilter.<Asset>byCompany();
        List<Asset> all = assetSpec != null ? assetRepository.findAll(assetSpec) : assetRepository.findAll();
        long assignedAssets = all.stream()
                .filter(a -> Asset.AssetStatus.IN_USE.equals(a.getStatus()))
                .count();
        long availableAssets = all.stream()
                .filter(a -> Asset.AssetStatus.AVAILABLE.equals(a.getStatus()))
                .count();
        Map<String, Object> result = new HashMap<>();
        result.put("totalAssets", all.size());
        result.put("assignedAssets", assignedAssets);
        result.put("availableAssets", availableAssets);
        return ResponseEntity.ok(result);
    }
}
