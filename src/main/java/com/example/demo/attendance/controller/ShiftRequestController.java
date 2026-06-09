package com.example.demo.attendance.controller;

import com.example.demo.base.entity.ShiftRequest;
import com.example.demo.base.entity.ShiftSchedule;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.ShiftRequestRepository;
import com.example.demo.base.repository.ShiftScheduleRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.entity.EmployeeWorkInformation;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.repository.EmployeeWorkInformationRepository;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/shift-requests")
@RequiredArgsConstructor
@Tag(name = "Shift Requests")
public class ShiftRequestController {

    private final ShiftRequestRepository shiftRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeWorkInformationRepository workInfoRepository;

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
        // Auto-populate previousShift from employee's current work info
        if (req.getPreviousShift() == null && req.getEmployee() != null && req.getEmployee().getId() != null) {
            workInfoRepository.findByEmployeeId(req.getEmployee().getId())
                    .map(EmployeeWorkInformation::getShift)
                    .ifPresent(req::setPreviousShift);
        }
        // isPermanent = true means no end date
        if (Boolean.TRUE.equals(req.getIsPermanent())) {
            req.setRequestedTill(null);
        }
        req.setStatus(ShiftRequest.ShiftRequestStatus.REQUESTED);
        req.setShiftChanged(false);
        req.setIsActive(true);
        return ResponseEntity.ok(shiftRequestRepository.save(req));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Approve a shift request")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        ShiftRequest req = shiftRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftRequest", id));

        // Prevent approving cancelled/already-approved
        if (req.getStatus() == ShiftRequest.ShiftRequestStatus.APPROVED) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request is already approved"));
        }

        // Overlap check
        LocalDate start = req.getRequestedDate();
        LocalDate end = Boolean.TRUE.equals(req.getIsPermanent()) ? LocalDate.MAX : req.getRequestedTill();
        if (start != null && end != null) {
            long overlapping = shiftRequestRepository.countOverlappingApproved(
                    req.getEmployee().getId(), start, end, req.getId());
            if (overlapping > 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "An approved shift request already exists during this time period"));
            }
        }

        req.setStatus(ShiftRequest.ShiftRequestStatus.APPROVED);
        req.setIsActive(true);

        // If today is within the requested period, apply shift immediately
        LocalDate today = LocalDate.now();
        boolean applyNow = false;
        if (Boolean.TRUE.equals(req.getIsPermanent())) {
            applyNow = req.getRequestedDate() != null && !today.isBefore(req.getRequestedDate());
        } else if (req.getRequestedDate() != null && req.getRequestedTill() != null) {
            applyNow = !today.isBefore(req.getRequestedDate()) && !today.isAfter(req.getRequestedTill());
        }

        if (applyNow) {
            applyShiftToEmployee(req.getEmployee().getId(), req.getRequestedShift());
            req.setShiftChanged(true);
            // Reallocation swap: give requesting employee's previous shift to reallocate_to
            if (req.getReallocateTo() != null && req.getPreviousShift() != null) {
                applyShiftToEmployee(req.getReallocateTo().getId(), req.getPreviousShift());
            }
        }

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
        req.setIsActive(false);
        return ResponseEntity.ok(shiftRequestRepository.save(req));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Cancel a shift request")
    public ResponseEntity<ShiftRequest> cancel(@PathVariable Long id) {
        ShiftRequest req = shiftRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftRequest", id));

        // If shift was already applied, revert to previousShift
        if (Boolean.TRUE.equals(req.getShiftChanged()) && req.getPreviousShift() != null) {
            applyShiftToEmployee(req.getEmployee().getId(), req.getPreviousShift());
            // Revert reallocation swap
            if (req.getReallocateTo() != null && req.getRequestedShift() != null) {
                applyShiftToEmployee(req.getReallocateTo().getId(), req.getRequestedShift());
            }
        }
        req.setStatus(ShiftRequest.ShiftRequestStatus.CANCELLED);
        req.setIsActive(false);
        return ResponseEntity.ok(shiftRequestRepository.save(req));
    }

    @PostMapping("/{id}/reallocate-approve")
    @PreAuthorize("hasAuthority('attendance:create')")
    @Transactional
    @Operation(summary = "Approve a shift reallocation (called by the reallocate_to employee)")
    public ResponseEntity<?> approveReallocation(@PathVariable Long id) {
        ShiftRequest req = shiftRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftRequest", id));

        // Overlap check for reallocate_to employee
        LocalDate start = req.getRequestedDate();
        LocalDate end = Boolean.TRUE.equals(req.getIsPermanent()) ? LocalDate.MAX : req.getRequestedTill();
        if (start != null && end != null && req.getReallocateTo() != null) {
            long overlapping = shiftRequestRepository.countOverlappingApproved(
                    req.getReallocateTo().getId(), start, end, null);
            if (overlapping > 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "An approved shift request already exists during this time period"));
            }
        }
        req.setReallocateApproved(true);
        req.setReallocateCanceled(false);
        return ResponseEntity.ok(shiftRequestRepository.save(req));
    }

    @PostMapping("/bulk-approve")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Bulk approve shift requests")
    public ResponseEntity<Map<String, Integer>> bulkApprove(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body.get("ids");
        if (ids == null) ids = List.of();
        int approved = 0;
        LocalDate today = LocalDate.now();
        for (Long reqId : ids) {
            Optional<ShiftRequest> opt = shiftRequestRepository.findById(reqId);
            if (opt.isEmpty()) continue;
            ShiftRequest req = opt.get();
            if (req.getStatus() == ShiftRequest.ShiftRequestStatus.APPROVED) continue;
            req.setStatus(ShiftRequest.ShiftRequestStatus.APPROVED);
            req.setIsActive(true);
            boolean applyNow = Boolean.TRUE.equals(req.getIsPermanent())
                    ? (req.getRequestedDate() != null && !today.isBefore(req.getRequestedDate()))
                    : (req.getRequestedDate() != null && req.getRequestedTill() != null
                       && !today.isBefore(req.getRequestedDate()) && !today.isAfter(req.getRequestedTill()));
            if (applyNow) {
                applyShiftToEmployee(req.getEmployee().getId(), req.getRequestedShift());
                req.setShiftChanged(true);
                if (req.getReallocateTo() != null && req.getPreviousShift() != null) {
                    applyShiftToEmployee(req.getReallocateTo().getId(), req.getPreviousShift());
                }
            }
            shiftRequestRepository.save(req);
            approved++;
        }
        return ResponseEntity.ok(Map.of("approved", approved));
    }

    @PostMapping("/bulk-cancel")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Bulk cancel shift requests")
    public ResponseEntity<Map<String, Integer>> bulkCancel(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body.get("ids");
        if (ids == null) ids = List.of();
        int cancelled = 0;
        for (Long reqId : ids) {
            Optional<ShiftRequest> opt = shiftRequestRepository.findById(reqId);
            if (opt.isEmpty()) continue;
            ShiftRequest req = opt.get();
            if (Boolean.TRUE.equals(req.getShiftChanged()) && req.getPreviousShift() != null) {
                applyShiftToEmployee(req.getEmployee().getId(), req.getPreviousShift());
            }
            req.setStatus(ShiftRequest.ShiftRequestStatus.CANCELLED);
            req.setIsActive(false);
            shiftRequestRepository.save(req);
            cancelled++;
        }
        return ResponseEntity.ok(Map.of("cancelled", cancelled));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Transactional
    @Operation(summary = "Delete a shift request (only non-approved requests can be deleted)")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        ShiftRequest req = shiftRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftRequest", id));
        if (req.getStatus() == ShiftRequest.ShiftRequestStatus.APPROVED) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot delete an approved shift request"));
        }
        shiftRequestRepository.delete(req);
        return ResponseEntity.ok(Map.of("message", "Shift request deleted"));
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
            header.createCell(0).setCellValue("Employee");
            header.createCell(1).setCellValue("Previous Shift");
            header.createCell(2).setCellValue("Requested Shift");
            header.createCell(3).setCellValue("From");
            header.createCell(4).setCellValue("Till");
            header.createCell(5).setCellValue("Permanent");
            header.createCell(6).setCellValue("Status");
            header.createCell(7).setCellValue("Shift Applied");

            int rowNum = 1;
            for (ShiftRequest req : requests) {
                Row row = sheet.createRow(rowNum++);
                String empName = req.getEmployee() != null
                        ? (req.getEmployee().getFirstName() + " " + req.getEmployee().getLastName()).trim()
                        : "";
                row.createCell(0).setCellValue(empName);
                row.createCell(1).setCellValue(req.getPreviousShift() != null ? req.getPreviousShift().getName() : "");
                row.createCell(2).setCellValue(req.getRequestedShift() != null ? req.getRequestedShift().getName() : "");
                row.createCell(3).setCellValue(req.getRequestedDate() != null ? req.getRequestedDate().toString() : "");
                row.createCell(4).setCellValue(req.getRequestedTill() != null ? req.getRequestedTill().toString() : "Permanent");
                row.createCell(5).setCellValue(Boolean.TRUE.equals(req.getIsPermanent()) ? "Yes" : "No");
                row.createCell(6).setCellValue(req.getStatus() != null ? req.getStatus().name() : "");
                row.createCell(7).setCellValue(Boolean.TRUE.equals(req.getShiftChanged()) ? "Yes" : "No");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=shift-requests.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        }
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private void applyShiftToEmployee(Long employeeId, ShiftSchedule shift) {
        workInfoRepository.findByEmployeeId(employeeId).ifPresent(workInfo -> {
            workInfo.setShift(shift);
            workInfoRepository.save(workInfo);
        });
    }
}
