package com.example.demo.report.entity;

import com.example.demo.base.entity.Company;
import com.example.demo.common.entity.BaseEntity;
import com.example.demo.employee.entity.Employee;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * A record of one generated/downloaded report (RPT-005: central Reports repository).
 * Stores the actual output file alongside metadata so it can be listed, filtered, grouped
 * into a Report Type / Year / Month / Created Date folder view, and re-downloaded later
 * without regenerating it.
 */
@Entity
@Table(name = "generated_reports", indexes = {
        @Index(name = "idx_generated_report_company_type", columnList = "company_id, report_type"),
        @Index(name = "idx_generated_report_period", columnList = "period_start, period_end")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
public class GeneratedReport extends BaseEntity {

    public enum ReportType {
        ATTENDANCE, CLOCK_IN_OUT, WEEKLY_ATTENDANCE, MONTHLY_ATTENDANCE, LEAVE, PAYROLL
    }

    public enum ReportStatus {
        PROCESSING, COMPLETED, FAILED
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", nullable = false)
    private ReportType reportType;

    /** Human-readable name shown in the UI, e.g. "Attendance Report - July 2026". */
    @Column(name = "report_name", nullable = false)
    private String reportName;

    @Column(name = "period_start")
    private LocalDate periodStart;

    @Column(name = "period_end")
    private LocalDate periodEnd;

    @Column(name = "generated_by_user_id")
    private Long generatedByUserId;

    @Column(name = "generated_by_name")
    private String generatedByName;

    @Column(name = "file_format", nullable = false)
    private String fileFormat = "XLSX";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ReportStatus status = ReportStatus.PROCESSING;

    @Column(name = "error_message")
    private String errorMessage;

    /** Relative path under the file storage root; null until status = COMPLETED. */
    @Column(name = "file_path")
    private String filePath;

    /** JSON blob of the exact filter parameters used to generate this report
     *  (date range, employee/department/branch filters, etc.) — RPT-005 req. #11. */
    @Column(name = "params_json", length = 2000)
    private String paramsJson;

    /** RPT-005 req. #10: archive without deleting; archived reports are excluded from the
     *  default list view but remain downloadable/searchable when explicitly requested. */
    @Column(name = "archived", nullable = false, columnDefinition = "boolean not null default false")
    private boolean archived = false;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    /** Set only for reports scoped to a single employee; null for company-wide reports. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "company",
            "jobPosition", "jobRole", "workType", "shift", "reportingManager", "user"})
    private Employee employee;
}
