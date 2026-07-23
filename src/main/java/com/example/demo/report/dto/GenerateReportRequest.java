package com.example.demo.report.dto;

import com.example.demo.report.entity.GeneratedReport;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class GenerateReportRequest {

    @NotNull
    private GeneratedReport.ReportType reportType;

    @NotNull
    private Long companyId;

    private LocalDate from;
    private LocalDate to;

    /** Optional: scopes the report to a single employee. */
    private Long employeeId;

    /** Optional, retained in paramsJson for record-keeping even though the export
     *  itself is not currently filtered by department. */
    private Long departmentId;
}
