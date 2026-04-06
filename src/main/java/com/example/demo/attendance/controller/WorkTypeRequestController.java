package com.example.demo.attendance.controller;

import com.example.demo.base.entity.WorkTypeRequest;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.WorkTypeRepository;
import com.example.demo.base.repository.WorkTypeRequestRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/work-type-requests")
@RequiredArgsConstructor
@Tag(name = "Work Type Requests")
public class WorkTypeRequestController {

    private final WorkTypeRequestRepository workTypeRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkTypeRepository workTypeRepository;
    private final CompanyRepository companyRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List work type requests (company-scoped)")
    public ResponseEntity<List<WorkTypeRequest>> listRequests() {
        var spec = ScopeFilter.<WorkTypeRequest>byEmployee();
        return ResponseEntity.ok(spec != null ? workTypeRequestRepository.findAll(spec) : workTypeRequestRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('attendance:create')")
    @Transactional
    @Operation(summary = "Submit a work type change request")
    public ResponseEntity<WorkTypeRequest> createRequest(@RequestBody WorkTypeRequest req) {
        if (req.getEmployee() != null && req.getEmployee().getId() != null) {
            req.setEmployee(employeeRepository.getReferenceById(req.getEmployee().getId()));
        }
        if (req.getRequestedWorkType() != null && req.getRequestedWorkType().getId() != null) {
            req.setRequestedWorkType(workTypeRepository.getReferenceById(req.getRequestedWorkType().getId()));
        }
        if (req.getCompany() != null && req.getCompany().getId() != null) {
            req.setCompany(companyRepository.getReferenceById(req.getCompany().getId()));
        }
        req.setStatus(WorkTypeRequest.WorkTypeRequestStatus.REQUESTED);
        return ResponseEntity.ok(workTypeRequestRepository.save(req));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Approve a work type request")
    public ResponseEntity<WorkTypeRequest> approve(@PathVariable Long id) {
        WorkTypeRequest req = workTypeRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorkTypeRequest", id));
        req.setStatus(WorkTypeRequest.WorkTypeRequestStatus.APPROVED);
        return ResponseEntity.ok(workTypeRequestRepository.save(req));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Reject a work type request")
    public ResponseEntity<WorkTypeRequest> reject(@PathVariable Long id) {
        WorkTypeRequest req = workTypeRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorkTypeRequest", id));
        req.setStatus(WorkTypeRequest.WorkTypeRequestStatus.REJECTED);
        return ResponseEntity.ok(workTypeRequestRepository.save(req));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Cancel a work type request")
    public ResponseEntity<WorkTypeRequest> cancel(@PathVariable Long id) {
        WorkTypeRequest req = workTypeRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorkTypeRequest", id));
        req.setStatus(WorkTypeRequest.WorkTypeRequestStatus.CANCELLED);
        return ResponseEntity.ok(workTypeRequestRepository.save(req));
    }

    @PostMapping("/bulk-approve")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Bulk approve work type requests")
    public ResponseEntity<List<WorkTypeRequest>> bulkApprove(@RequestBody List<Long> ids) {
        List<WorkTypeRequest> requests = workTypeRequestRepository.findAllById(ids);
        requests.forEach(r -> r.setStatus(WorkTypeRequest.WorkTypeRequestStatus.APPROVED));
        return ResponseEntity.ok(workTypeRequestRepository.saveAll(requests));
    }

    @PostMapping("/bulk-cancel")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Bulk cancel work type requests")
    public ResponseEntity<List<WorkTypeRequest>> bulkCancel(@RequestBody List<Long> ids) {
        List<WorkTypeRequest> requests = workTypeRequestRepository.findAllById(ids);
        requests.forEach(r -> r.setStatus(WorkTypeRequest.WorkTypeRequestStatus.CANCELLED));
        return ResponseEntity.ok(workTypeRequestRepository.saveAll(requests));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "Export work type requests to Excel")
    public ResponseEntity<byte[]> export(@RequestParam Long companyId) throws IOException {
        List<WorkTypeRequest> requests = workTypeRequestRepository.findByCompanyId(companyId);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Work Type Requests");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Employee Name");
            header.createCell(1).setCellValue("Current Work Type");
            header.createCell(2).setCellValue("Requested Work Type");
            header.createCell(3).setCellValue("Status");
            header.createCell(4).setCellValue("Request Date");

            int rowNum = 1;
            for (WorkTypeRequest req : requests) {
                Row row = sheet.createRow(rowNum++);
                String empName = req.getEmployee() != null
                        ? (req.getEmployee().getFirstName() + " " + req.getEmployee().getLastName()).trim()
                        : "";
                String previousWorkType = req.getPreviousWorkType() != null ? req.getPreviousWorkType().getName() : "";
                String requestedWorkType = req.getRequestedWorkType() != null ? req.getRequestedWorkType().getName() : "";
                row.createCell(0).setCellValue(empName);
                row.createCell(1).setCellValue(previousWorkType);
                row.createCell(2).setCellValue(requestedWorkType);
                row.createCell(3).setCellValue(req.getStatus() != null ? req.getStatus().name() : "");
                row.createCell(4).setCellValue(req.getRequestedDate() != null ? req.getRequestedDate().toString() : "");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=work-type-requests.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        }
    }
}
