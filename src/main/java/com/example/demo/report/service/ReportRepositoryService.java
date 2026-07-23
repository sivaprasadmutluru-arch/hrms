package com.example.demo.report.service;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.service.FileUploadService;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.payroll.entity.Payslip;
import com.example.demo.payroll.repository.PayslipRepository;
import com.example.demo.payroll.service.PayslipExcelExportService;
import com.example.demo.report.dto.GenerateReportRequest;
import com.example.demo.report.entity.GeneratedReport;
import com.example.demo.report.repository.GeneratedReportRepository;
import com.example.demo.report.util.ExcelExporter;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * RPT-005: central Reports repository. Generates report files by delegating to the existing
 * export logic (ConsolidatedReportService / ExcelExporter / PayslipExcelExportService — this
 * class does not reimplement any report data-building, only persists what they already build),
 * stores the output, and records it so it can be listed, filtered, and re-downloaded later
 * without regenerating.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportRepositoryService {

    private final GeneratedReportRepository generatedReportRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final PayslipRepository payslipRepository;
    private final FileUploadService fileUploadService;
    private final ConsolidatedReportService reportService;
    private final ExcelExporter excelExporter;
    private final PayslipExcelExportService payslipExcelExportService;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMMM yyyy");

    @Transactional
    public GeneratedReport generate(GenerateReportRequest req, Long userId, String userName) {
        Company company = companyRepository.findById(req.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", req.getCompanyId()));

        LocalDate from = req.getFrom() != null ? req.getFrom() : LocalDate.now().withDayOfMonth(1);
        LocalDate to = req.getTo() != null ? req.getTo() : from.withDayOfMonth(from.lengthOfMonth());

        GeneratedReport record = new GeneratedReport();
        record.setReportType(req.getReportType());
        record.setReportName(reportTypeLabel(req.getReportType()) + " - " + from.format(MONTH_LABEL));
        record.setPeriodStart(from);
        record.setPeriodEnd(to);
        record.setGeneratedByUserId(userId);
        record.setGeneratedByName(userName);
        record.setFileFormat("XLSX");
        record.setStatus(GeneratedReport.ReportStatus.PROCESSING);
        record.setCompany(company);
        if (req.getEmployeeId() != null) {
            employeeRepository.findById(req.getEmployeeId()).ifPresent(record::setEmployee);
        }
        try {
            record.setParamsJson(objectMapper.writeValueAsString(req));
        } catch (Exception ignored) {
            // params retention is best-effort; never block report generation on it
        }
        record = generatedReportRepository.save(record);

        try {
            byte[] bytes = buildReportBytes(req.getReportType(), from, to);
            record.setFilePath(storeReportFile(company, req.getReportType(), from, record.getReportName(), bytes));
            record.setStatus(GeneratedReport.ReportStatus.COMPLETED);
        } catch (Exception e) {
            log.warn("Report generation failed for type={} companyId={}: {}", req.getReportType(), req.getCompanyId(), e.getMessage());
            record.setStatus(GeneratedReport.ReportStatus.FAILED);
            record.setErrorMessage(e.getMessage() != null ? e.getMessage() : "Unknown error during report generation");
        }
        return generatedReportRepository.save(record);
    }

    /**
     * Records a report that was generated through one of the existing per-module export
     * endpoints (Attendance/Leave/Payroll "Export Excel" buttons) into the central repository,
     * reusing bytes that endpoint already computed — RPT-005 req. #13: reports must be available
     * from both the relevant module and the central Reports module. Never throws: a failure here
     * must not block the caller's file download, so exceptions are logged and swallowed.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordExistingExport(GeneratedReport.ReportType type, LocalDate from, LocalDate to,
                                      Long companyId, byte[] bytes, Long userId, String userName) {
        try {
            Company company = companyRepository.findById(companyId).orElse(null);
            if (company == null) return;
            GeneratedReport record = new GeneratedReport();
            record.setReportType(type);
            record.setReportName(reportTypeLabel(type) + " - " + from.format(MONTH_LABEL));
            record.setPeriodStart(from);
            record.setPeriodEnd(to);
            record.setGeneratedByUserId(userId);
            record.setGeneratedByName(userName);
            record.setFileFormat("XLSX");
            record.setCompany(company);
            record.setFilePath(storeReportFile(company, type, from, record.getReportName(), bytes));
            record.setStatus(GeneratedReport.ReportStatus.COMPLETED);
            generatedReportRepository.save(record);
        } catch (Exception e) {
            log.warn("Failed to record existing export (type={}, companyId={}) into the reports repository: {}",
                    type, companyId, e.getMessage());
        }
    }

    private String storeReportFile(Company company, GeneratedReport.ReportType type, LocalDate periodStart,
                                    String reportName, byte[] bytes) {
        String orgSlug = company.getOrganization() != null && company.getOrganization().getSlug() != null
                ? company.getOrganization().getSlug() : "default";
        String subDir = "reports/" + type.name().toLowerCase() + "/" + periodStart.getYear() + "/" + periodStart.getMonthValue();
        String filename = reportName.replaceAll("[^a-zA-Z0-9-]", "_") + ".xlsx";
        return fileUploadService.storeBytesOrgScoped(bytes, filename, orgSlug, subDir);
    }

    /** Re-download an existing, already-generated report — does not create a new record
     *  (RPT-005 req. #9: downloading must not duplicate the report). Enforces the same
     *  company/self access scope as list() so a report ID can't be used to bypass it. */
    public byte[] download(Long reportId) {
        GeneratedReport record = generatedReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("GeneratedReport", reportId));
        enforceReadAccess(record);
        if (record.getStatus() != GeneratedReport.ReportStatus.COMPLETED || record.getFilePath() == null) {
            throw new BadRequestException("Report is not available for download (status: " + record.getStatus() + ")");
        }
        return fileUploadService.readBytes(record.getFilePath());
    }

    /** RPT-005 req. #10: rename a report where permitted (same access scope as download/list). */
    @Transactional
    public GeneratedReport rename(Long reportId, String newName) {
        if (newName == null || newName.isBlank()) {
            throw new BadRequestException("Report name must not be empty");
        }
        GeneratedReport record = generatedReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("GeneratedReport", reportId));
        enforceReadAccess(record);
        record.setReportName(newName.trim());
        return generatedReportRepository.save(record);
    }

    /** RPT-005 req. #10: archive/unarchive without deleting the record or its file. */
    @Transactional
    public GeneratedReport setArchived(Long reportId, boolean archived) {
        GeneratedReport record = generatedReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("GeneratedReport", reportId));
        enforceReadAccess(record);
        record.setArchived(archived);
        return generatedReportRepository.save(record);
    }

    /** Throws AccessDeniedException unless the current scope may read this specific record:
     *  self-scoped employees only their own employee-linked reports; company/branch-scoped
     *  roles only reports whose company is within their accessible companies; unrestricted
     *  (platform admin) scopes always pass. */
    private void enforceReadAccess(GeneratedReport record) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null || scope.hasUnrestrictedAccess()) return;
        if (scope.isSelfScope()) {
            Long userId = scope.getUserId();
            boolean owns = record.getEmployee() != null && record.getEmployee().getUser() != null
                    && record.getEmployee().getUser().getId().equals(userId);
            if (!owns) throw new AccessDeniedException("You are not authorized to access this report");
            return;
        }
        Long companyId = record.getCompany() != null ? record.getCompany().getId() : null;
        if (companyId == null || !scope.canAccess(companyId)) {
            throw new AccessDeniedException("You are not authorized to access this report");
        }
    }

    public Page<GeneratedReport> list(GeneratedReport.ReportType type, Long companyId, Long employeeId,
                                       Long departmentId, Integer year, Integer month,
                                       LocalDate from, LocalDate to, String generatedBy,
                                       GeneratedReport.ReportStatus status, boolean includeArchived, Pageable pageable) {
        Specification<GeneratedReport> spec = ScopeFilter.byCompanyOrAll();

        // Self-scoped employees only ever see their own employee-linked reports, regardless
        // of any employeeId/companyId filter passed in.
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope != null && scope.isSelfScope()) {
            Long userId = scope.getUserId();
            spec = spec.and((root, q, cb) -> cb.equal(root.get("employee").get("user").get("id"), userId));
        }

        if (!includeArchived) {
            spec = spec.and((root, q, cb) -> cb.isFalse(root.get("archived")));
        }
        if (companyId != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("company").get("id"), companyId));
        }
        if (type != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("reportType"), type));
        }
        if (employeeId != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("employee").get("id"), employeeId));
        }
        if (departmentId != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("employee").get("department").get("id"), departmentId));
        }
        if (status != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("status"), status));
        }
        if (generatedBy != null && !generatedBy.isBlank()) {
            String pattern = "%" + generatedBy.toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> cb.like(cb.lower(root.get("generatedByName")), pattern));
        }
        // Resolve an effective date window from year/month (folder-style filter) and/or explicit from/to
        LocalDate effectiveFrom = from;
        LocalDate effectiveTo = to;
        if (year != null) {
            LocalDate yearStart = LocalDate.of(year, 1, 1);
            LocalDate yearEnd = LocalDate.of(year, 12, 31);
            if (month != null) {
                yearStart = LocalDate.of(year, month, 1);
                yearEnd = yearStart.withDayOfMonth(yearStart.lengthOfMonth());
            }
            effectiveFrom = effectiveFrom == null || effectiveFrom.isBefore(yearStart) ? yearStart : effectiveFrom;
            effectiveTo = effectiveTo == null || effectiveTo.isAfter(yearEnd) ? yearEnd : effectiveTo;
        }
        if (effectiveFrom != null) {
            LocalDate finalFrom = effectiveFrom;
            spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("periodStart"), finalFrom));
        }
        if (effectiveTo != null) {
            LocalDate finalTo = effectiveTo;
            spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("periodStart"), finalTo));
        }

        return generatedReportRepository.findAll(spec, pageable);
    }

    private byte[] buildReportBytes(GeneratedReport.ReportType type, LocalDate from, LocalDate to) throws Exception {
        return switch (type) {
            case ATTENDANCE, CLOCK_IN_OUT, WEEKLY_ATTENDANCE, MONTHLY_ATTENDANCE ->
                    excelExporter.buildSheet("attendance", reportService.getExportData("attendance", from, to));
            case LEAVE ->
                    excelExporter.buildSheet("leave", reportService.getExportData("leave", from, to));
            case PAYROLL -> {
                Specification<Payslip> spec = ScopeFilter.byCompany();
                List<Payslip> payslips = spec != null ? payslipRepository.findAll(spec) : payslipRepository.findAll();
                LocalDate finalFrom = from;
                LocalDate finalTo = to;
                payslips = payslips.stream()
                        .filter(p -> p.getStartDate() != null && !p.getStartDate().isBefore(finalFrom) && !p.getStartDate().isAfter(finalTo))
                        .toList();
                yield payslipExcelExportService.exportPayslips(payslips, from, to);
            }
        };
    }

    private String reportTypeLabel(GeneratedReport.ReportType type) {
        return switch (type) {
            case ATTENDANCE -> "Attendance Report";
            case CLOCK_IN_OUT -> "Clock-In/Clock-Out Report";
            case WEEKLY_ATTENDANCE -> "Weekly Attendance Report";
            case MONTHLY_ATTENDANCE -> "Monthly Attendance Report";
            case LEAVE -> "Leave Report";
            case PAYROLL -> "Payroll Report";
        };
    }
}
