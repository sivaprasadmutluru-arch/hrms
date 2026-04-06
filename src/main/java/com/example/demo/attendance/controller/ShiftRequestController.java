package com.example.demo.attendance.controller;

import com.example.demo.base.entity.ShiftRequest;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.ShiftRequestRepository;
import com.example.demo.base.repository.ShiftScheduleRepository;
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
@RequestMapping("/api/shift-requests")
@RequiredArgsConstructor
@Tag(name = "Shift Requests")
public class ShiftRequestController {

    private final ShiftRequestRepository shiftRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;
    private final CompanyRepository companyRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List shift requests (company-scoped)")
    public ResponseEntity<List<ShiftRequest>> listRequests() {
        var spec = ScopeFilter.<ShiftRequest>byEmployee();
        return ResponseEntity.ok(spec != null ? shiftRequestRepository.findAll(spec) : shiftRequestRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('attendance:create')")
    @Transactional
    @Operation(summary = "Submit a shift change request")
    public ResponseEntity<ShiftRequest> createRequest(@RequestBody ShiftRequest req) {
        if (req.getEmployee() != null && req.getEmployee().getId() != null) {
            req.setEmployee(employeeRepository.getReferenceById(req.getEmployee().getId()));
        }
        if (req.getRequestedShift() != null && req.getRequestedShift().getId() != null) {
            req.setRequestedShift(shiftScheduleRepository.getReferenceById(req.getRequestedShift().getId()));
        }
        if (req.getCompany() != null && req.getCompany().getId() != null) {
            req.setCompany(companyRepository.getReferenceById(req.getCompany().getId()));
        }
        req.setStatus(ShiftRequest.ShiftRequestStatus.REQUESTED);
        return ResponseEntity.ok(shiftRequestRepository.save(req));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Approve a shift request")
    public ResponseEntity<ShiftRequest> approve(@PathVariable Long id) {
        ShiftRequest req = shiftRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftRequest", id));
        req.setStatus(ShiftRequest.ShiftRequestStatus.APPROVED);
        return ResponseEntity.ok(shiftRequestRepository.save(req));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Reject a shift request")
    public ResponseEntity<ShiftRequest> reject(@PathVariable Long id) {
        ShiftRequest req = shiftRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftRequest", id));
        req.setStatus(ShiftRequest.ShiftRequestStatus.REJECTED);
        return ResponseEntity.ok(shiftRequestRepository.save(req));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Cancel a shift request")
    public ResponseEntity<ShiftRequest> cancel(@PathVariable Long id) {
        ShiftRequest req = shiftRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftRequest", id));
        req.setStatus(ShiftRequest.ShiftRequestStatus.CANCELLED);
        return ResponseEntity.ok(shiftRequestRepository.save(req));
    }

    @PostMapping("/bulk-approve")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Bulk approve shift requests")
    public ResponseEntity<List<ShiftRequest>> bulkApprove(@RequestBody List<Long> ids) {
        List<ShiftRequest> requests = shiftRequestRepository.findAllById(ids);
        requests.forEach(r -> r.setStatus(ShiftRequest.ShiftRequestStatus.APPROVED));
        return ResponseEntity.ok(shiftRequestRepository.saveAll(requests));
    }

    @PostMapping("/bulk-cancel")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Bulk cancel shift requests")
    public ResponseEntity<List<ShiftRequest>> bulkCancel(@RequestBody List<Long> ids) {
        List<ShiftRequest> requests = shiftRequestRepository.findAllById(ids);
        requests.forEach(r -> r.setStatus(ShiftRequest.ShiftRequestStatus.CANCELLED));
        return ResponseEntity.ok(shiftRequestRepository.saveAll(requests));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "Export shift requests to Excel")
    public ResponseEntity<byte[]> export(@RequestParam Long companyId) throws IOException {
        List<ShiftRequest> requests = shiftRequestRepository.findByCompanyId(companyId);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Shift Requests");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Employee Name");
            header.createCell(1).setCellValue("Current Shift");
            header.createCell(2).setCellValue("Requested Shift");
            header.createCell(3).setCellValue("Status");
            header.createCell(4).setCellValue("Request Date");

            int rowNum = 1;
            for (ShiftRequest req : requests) {
                Row row = sheet.createRow(rowNum++);
                String empName = req.getEmployee() != null
                        ? (req.getEmployee().getFirstName() + " " + req.getEmployee().getLastName()).trim()
                        : "";
                String previousShift = req.getPreviousShift() != null ? req.getPreviousShift().getName() : "";
                String requestedShift = req.getRequestedShift() != null ? req.getRequestedShift().getName() : "";
                row.createCell(0).setCellValue(empName);
                row.createCell(1).setCellValue(previousShift);
                row.createCell(2).setCellValue(requestedShift);
                row.createCell(3).setCellValue(req.getStatus() != null ? req.getStatus().name() : "");
                row.createCell(4).setCellValue(req.getRequestedDate() != null ? req.getRequestedDate().toString() : "");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=shift-requests.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        }
    }
}
