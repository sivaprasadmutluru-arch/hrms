package com.example.demo.leave.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.base.entity.Department;
import com.example.demo.base.repository.DepartmentRepository;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.dto.*;
import com.example.demo.leave.entity.*;
import com.example.demo.leave.repository.*;
import com.example.demo.leave.service.LeaveAccrualService;
import com.example.demo.leave.service.LeaveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.demo.auth.security.UserPrincipal;

import jakarta.servlet.http.HttpServletResponse;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/leave")
@RequiredArgsConstructor
@Tag(name = "Leave")
public class LeaveController {

    @Value("${app.upload.dir:uploads/leave}")
    private String uploadDir;

    private final LeaveService leaveService;
    private final LeaveAccrualService leaveAccrualService;
    private final LeaveAccrualLogRepository accrualLogRepository;
    private final AvailableLeaveRepository availableLeaveRepository;
    private final LeaveAllocationRequestRepository allocationRequestRepository;
    private final RestrictLeaveRepository restrictLeaveRepository;
    private final LeaveGeneralSettingRepository generalSettingRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final CompanyRepository companyRepository;
    private final LeaveRequestCommentRepository leaveRequestCommentRepository;
    private final LeaveRequestFileRepository leaveRequestFileRepository;
    private final LeaveAllocationRequestCommentRepository allocationRequestCommentRepository;
    private final LeaveRequestConditionApprovalRepository conditionApprovalRepository;
    private final EmployeePastLeaveRestrictRepository pastLeaveRestrictRepository;
    private final CompensatoryLeaveRequestRepository compensatoryLeaveRequestRepository;
    private final CompensatoryLeaveRequestCommentRepository compensatoryLeaveRequestCommentRepository;
    private final HolidayRepository holidayRepository;
    private final HolidayAllocationRepository holidayAllocationRepository;
    private final DepartmentRepository departmentRepository;
    private final CompanyLeaveRepository companyLeaveRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveAllocationRepository leaveAllocationRepository;

    @GetMapping("/requests")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List all leave requests (company-scoped)")
    public ResponseEntity<Page<LeaveRequestDTO>> listRequests(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(leaveService.getAllRequests(pageable).map(LeaveMapper::toDTO));
    }

    @GetMapping("/types")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get leave types for company")
    public ResponseEntity<List<LeaveTypeDTO>> getTypes() {
        return ResponseEntity.ok(leaveService.getLeaveTypes().stream().map(LeaveMapper::toDTO).toList());
    }

    @PostMapping("/types")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a leave type (isOrganizationWide=true requires Head Office access)")
    public ResponseEntity<LeaveTypeDTO> createLeaveType(@RequestBody LeaveType leaveType) {
        return ResponseEntity.ok(LeaveMapper.toDTO(leaveService.createLeaveType(leaveType)));
    }

    @PutMapping("/types/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Update a leave type")
    public ResponseEntity<LeaveTypeDTO> updateLeaveType(@PathVariable Long id, @RequestBody LeaveType updated) {
        return ResponseEntity.ok(LeaveMapper.toDTO(leaveService.updateLeaveType(id, updated)));
    }

    @DeleteMapping("/types/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a leave type")
    public ResponseEntity<Map<String, String>> deleteLeaveType(@PathVariable Long id) {
        leaveService.deleteLeaveType(id);
        return ResponseEntity.ok(Map.of("message", "Leave type deleted"));
    }

    @PostMapping("/apply")
    @PreAuthorize("hasAuthority('leave:create')")
    @Operation(summary = "Apply for leave")
    public ResponseEntity<LeaveRequestDTO> apply(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody ApplyLeaveRequest body) {
        Long resolvedEmployeeId = body.employeeId() != null ? body.employeeId()
                : employeeRepository.findByUserId(principal.getId())
                        .map(e -> e.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Employee record not found for current user"));
        return ResponseEntity.ok(LeaveMapper.toDTO(
                leaveService.applyLeave(resolvedEmployeeId, body.leaveTypeId(), body.startDate(), body.endDate(), body.description(), body.companyId())));
    }

    @PostMapping("/requests/{id}/approve")
    @PreAuthorize("hasAuthority('leave:approve')")
    @Operation(summary = "Approve leave request")
    public ResponseEntity<LeaveRequestDTO> approve(@PathVariable Long id) {
        return ResponseEntity.ok(LeaveMapper.toDTO(leaveService.approve(id)));
    }

    @PostMapping("/requests/{id}/reject")
    @PreAuthorize("hasAuthority('leave:approve')")
    @Operation(summary = "Reject leave request")
    public ResponseEntity<LeaveRequestDTO> reject(@PathVariable Long id,
                                                   @RequestBody(required = false) RejectLeaveRequest body) {
        String reason = body != null ? body.reason() : null;
        return ResponseEntity.ok(LeaveMapper.toDTO(leaveService.reject(id, reason)));
    }

    @PostMapping("/requests/{id}/cancel")
    @PreAuthorize("hasAuthority('leave:create')")
    @Operation(summary = "Cancel a leave request (employee self-cancel, restores balance if approved)")
    public ResponseEntity<LeaveRequestDTO> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(LeaveMapper.toDTO(leaveService.cancel(id)));
    }

    @GetMapping("/allocations")
    @PreAuthorize("hasAuthority('leave:view')")
    @Operation(summary = "List leave allocations (company-scoped)")
    public ResponseEntity<List<LeaveAllocationDTO>> listAllocations(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(leaveService.getAllocations(employeeId, year).stream().map(LeaveMapper::toDTO).toList());
    }

    @PostMapping("/allocate")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Allocate leave days to employee")
    public ResponseEntity<Map<String, String>> allocate(@RequestBody AllocateLeaveRequest body) {
        leaveService.allocateLeave(body.employeeId(), body.leaveTypeId(), body.days(), body.year(), body.companyId());
        return ResponseEntity.ok(Map.of("message", "Leave allocated successfully"));
    }

    @PostMapping("/allocate/bulk")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Bulk-allocate leave days to all active employees in a company")
    public ResponseEntity<Map<String, String>> bulkAllocate(@RequestBody BulkAllocateRequest body) {
        leaveService.bulkAllocate(body.companyId(), body.leaveTypeId(), body.days(), body.year());
        return ResponseEntity.ok(Map.of("message", "Bulk allocation completed"));
    }

    @PostMapping("/reset/annual")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Run annual leave reset with carry-forward logic for all employees in a company")
    public ResponseEntity<Map<String, String>> annualReset(@RequestBody AnnualResetRequest body) {
        leaveService.annualReset(body.companyId(), body.year());
        return ResponseEntity.ok(Map.of("message", "Annual reset completed for year " + body.year()));
    }

    // ─── Leave Balance (AvailableLeave) ──────────────────────────────────────

    @GetMapping("/balance")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get leave balance for all employees (company-scoped)")
    public ResponseEntity<List<AvailableLeaveDTO>> listBalance() {
        var spec = ScopeFilter.<AvailableLeave>byEmployeeCompany();
        List<AvailableLeave> result = spec != null
                ? availableLeaveRepository.findAll(spec)
                : availableLeaveRepository.findAll();
        var scope = AccessScopeContext.get();
        Long companyId = scope != null ? scope.getCompanyId() : null;
        java.util.Map<String, Double> usedDaysMap = new java.util.HashMap<>();
        if (companyId != null) {
            leaveRequestRepository.sumApprovedDaysByEmployeeAndLeaveType(companyId)
                    .forEach(row -> usedDaysMap.put(row[0] + ":" + row[1], ((Number) row[2]).doubleValue()));
        }
        return ResponseEntity.ok(result.stream().map(al -> {
            Long empId = al.getEmployee() != null ? al.getEmployee().getId() : null;
            Long ltId = al.getLeaveType() != null ? al.getLeaveType().getId() : null;
            double used = (empId != null && ltId != null) ? usedDaysMap.getOrDefault(empId + ":" + ltId, 0.0) : 0.0;
            return LeaveMapper.toDTO(al, used);
        }).toList());
    }

    @GetMapping("/balance/employee/{employeeId}")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get leave balance for a specific employee")
    public ResponseEntity<List<AvailableLeaveDTO>> getEmployeeBalance(@PathVariable Long employeeId) {
        java.util.Map<Long, Double> usedByType = new java.util.HashMap<>();
        leaveRequestRepository.sumApprovedDaysByLeaveTypeForEmployee(employeeId)
                .forEach(row -> usedByType.put(((Number) row[0]).longValue(), ((Number) row[1]).doubleValue()));
        return ResponseEntity.ok(availableLeaveRepository.findByEmployeeId(employeeId).stream().map(al -> {
            Long ltId = al.getLeaveType() != null ? al.getLeaveType().getId() : null;
            double used = ltId != null ? usedByType.getOrDefault(ltId, 0.0) : 0.0;
            return LeaveMapper.toDTO(al, used);
        }).toList());
    }

    @PutMapping("/balance/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Directly update an employee's leave balance record")
    public ResponseEntity<AvailableLeaveDTO> updateBalance(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        AvailableLeave al = availableLeaveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AvailableLeave", id));
        if (body.containsKey("availableDays")) al.setAvailableDays(((Number) body.get("availableDays")).doubleValue());
        if (body.containsKey("carryforwardDays")) al.setCarryforwardDays(((Number) body.get("carryforwardDays")).doubleValue());
        if (body.containsKey("totalLeaveDays")) al.setTotalLeaveDays(((Number) body.get("totalLeaveDays")).doubleValue());
        if (body.containsKey("resetDate") && body.get("resetDate") != null)
            al.setResetDate(LocalDate.parse(body.get("resetDate").toString()));
        if (body.containsKey("expiredDate"))
            al.setExpiredDate(body.get("expiredDate") != null ? LocalDate.parse(body.get("expiredDate").toString()) : null);
        return ResponseEntity.ok(LeaveMapper.toDTO(availableLeaveRepository.save(al)));
    }

    @GetMapping("/balance/export")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Export leave balances as Excel")
    public void exportBalance(
            @RequestParam Long companyId,
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            HttpServletResponse response) throws IOException {
        var scopeSpec = ScopeFilter.<AvailableLeave>byEmployeeCompany();

        org.springframework.data.jpa.domain.Specification<AvailableLeave> spec = scopeSpec;

        if (employeeIds != null && !employeeIds.isEmpty()) {
            org.springframework.data.jpa.domain.Specification<AvailableLeave> empSpec =
                (root, query, cb) -> root.get("employee").get("id").in(employeeIds);
            spec = spec != null ? spec.and(empSpec) : empSpec;
        }
        if (fromDate != null) {
            LocalDate fd = fromDate;
            org.springframework.data.jpa.domain.Specification<AvailableLeave> fromSpec =
                (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("assignedDate"), fd);
            spec = spec != null ? spec.and(fromSpec) : fromSpec;
        }
        if (toDate != null) {
            LocalDate td = toDate;
            org.springframework.data.jpa.domain.Specification<AvailableLeave> toSpec =
                (root, query, cb) -> cb.lessThanOrEqualTo(root.get("assignedDate"), td);
            spec = spec != null ? spec.and(toSpec) : toSpec;
        }

        List<AvailableLeave> records = spec != null
                ? availableLeaveRepository.findAll(spec)
                : availableLeaveRepository.findAll();

        // Build used-days lookup: key = "employeeId:leaveTypeId"
        // Use AccessScopeContext company ID (same source as /balance endpoint) to ensure consistency
        var exportScope = AccessScopeContext.get();
        Long usedDaysCompanyId = (exportScope != null && exportScope.getCompanyId() != null)
                ? exportScope.getCompanyId() : companyId;
        java.util.Map<String, Double> usedDaysMap = new java.util.HashMap<>();
        if (usedDaysCompanyId != null) {
            leaveRequestRepository.sumApprovedDaysByEmployeeAndLeaveType(usedDaysCompanyId)
                    .forEach(row -> usedDaysMap.put(row[0] + ":" + row[1], ((Number) row[2]).doubleValue()));
        }

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=leave_balance.xlsx");
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Leave Balance");
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row header = sheet.createRow(0);
            String[] cols = {"Employee", "Leave Type", "Available Days", "Carry Forward", "Used Days", "Total Days", "Assigned Date", "Reset Date", "Expires"};
            for (int i = 0; i < cols.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                cell.setCellStyle(headerStyle);
            }
            int rowNum = 1;
            for (AvailableLeave al : records) {
                Row row = sheet.createRow(rowNum++);
                String empName = al.getEmployee() != null
                        ? (al.getEmployee().getFirstName() != null ? al.getEmployee().getFirstName() : "") + " "
                          + (al.getEmployee().getLastName() != null ? al.getEmployee().getLastName() : "")
                        : "";
                Long empId = al.getEmployee() != null ? al.getEmployee().getId() : null;
                Long ltId = al.getLeaveType() != null ? al.getLeaveType().getId() : null;
                double usedDays = (empId != null && ltId != null)
                        ? usedDaysMap.getOrDefault(empId + ":" + ltId, 0.0) : 0.0;
                row.createCell(0).setCellValue(empName.trim());
                row.createCell(1).setCellValue(al.getLeaveType() != null ? al.getLeaveType().getName() : "");
                row.createCell(2).setCellValue(al.getAvailableDays() != null ? al.getAvailableDays() : 0.0);
                row.createCell(3).setCellValue(al.getCarryforwardDays() != null ? al.getCarryforwardDays() : 0.0);
                row.createCell(4).setCellValue(usedDays);
                row.createCell(5).setCellValue(al.getTotalLeaveDays() != null ? al.getTotalLeaveDays() : 0.0);
                row.createCell(6).setCellValue(al.getAssignedDate() != null ? al.getAssignedDate().toString() : "");
                row.createCell(7).setCellValue(al.getResetDate() != null ? al.getResetDate().toString() : "");
                row.createCell(8).setCellValue(al.getExpiredDate() != null ? al.getExpiredDate().toString() : "");
            }
            for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
            workbook.write(response.getOutputStream());
        }
    }

    @PostMapping("/balance/credit")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Credit leave days to an employee's balance")
    public ResponseEntity<AvailableLeaveDTO> creditBalance(@RequestBody CreditBalanceRequest body) {
        AvailableLeave al = availableLeaveRepository.findByEmployeeIdAndLeaveTypeId(body.employeeId(), body.leaveTypeId())
                .orElseGet(() -> {
                    AvailableLeave n = new AvailableLeave();
                    n.setEmployee(employeeRepository.getReferenceById(body.employeeId()));
                    n.setLeaveType(leaveTypeRepository.getReferenceById(body.leaveTypeId()));
                    n.setAssignedDate(LocalDate.now());
                    return n;
                });
        al.setAvailableDays(al.getAvailableDays() + body.days());
        al.setTotalLeaveDays(al.getTotalLeaveDays() + body.days());
        return ResponseEntity.ok(LeaveMapper.toDTO(availableLeaveRepository.save(al)));
    }

    // ─── Leave Allocation Requests ────────────────────────────────────────────

    @GetMapping("/allocation-requests")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List leave allocation requests (company-scoped)")
    public ResponseEntity<List<LeaveAllocationRequestDTO>> listAllocationRequests() {
        var spec = ScopeFilter.<LeaveAllocationRequest>byEmployee();
        List<LeaveAllocationRequest> result = spec != null
                ? allocationRequestRepository.findAll(spec)
                : allocationRequestRepository.findAll();
        return ResponseEntity.ok(result.stream().map(LeaveMapper::toDTO).toList());
    }

    @PostMapping("/allocation-requests")
    @PreAuthorize("hasAuthority('leave:create')")
    @Transactional
    @Operation(summary = "Submit a leave allocation request")
    public ResponseEntity<LeaveAllocationRequestDTO> createAllocationRequest(@RequestBody LeaveAllocationRequest req) {
        if (req.getEmployee() != null && req.getEmployee().getId() != null) {
            req.setEmployee(employeeRepository.getReferenceById(req.getEmployee().getId()));
        }
        if (req.getLeaveType() != null && req.getLeaveType().getId() != null) {
            req.setLeaveType(leaveTypeRepository.getReferenceById(req.getLeaveType().getId()));
        }
        req.setRequestedDate(LocalDate.now());
        req.setStatus(LeaveAllocationRequest.AllocationStatus.REQUESTED);
        return ResponseEntity.ok(LeaveMapper.toDTO(allocationRequestRepository.save(req)));
    }

    @PostMapping("/allocation-requests/{id}/approve")
    @PreAuthorize("hasAuthority('leave:approve')")
    @Transactional
    @Operation(summary = "Approve a leave allocation request")
    public ResponseEntity<LeaveAllocationRequestDTO> approveAllocationRequest(@PathVariable Long id) {
        LeaveAllocationRequest req = allocationRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveAllocationRequest", id));
        req.setStatus(LeaveAllocationRequest.AllocationStatus.APPROVED);
        AvailableLeave al = availableLeaveRepository
                .findByEmployeeIdAndLeaveTypeId(req.getEmployee().getId(), req.getLeaveType().getId())
                .orElseGet(() -> {
                    AvailableLeave n = new AvailableLeave();
                    n.setEmployee(req.getEmployee());
                    n.setLeaveType(req.getLeaveType());
                    n.setAssignedDate(LocalDate.now());
                    return n;
                });
        al.setAvailableDays(al.getAvailableDays() + req.getRequestedDays());
        al.setTotalLeaveDays(al.getTotalLeaveDays() + req.getRequestedDays());
        availableLeaveRepository.save(al);
        return ResponseEntity.ok(LeaveMapper.toDTO(allocationRequestRepository.save(req)));
    }

    @PostMapping("/allocation-requests/{id}/reject")
    @PreAuthorize("hasAuthority('leave:approve')")
    @Transactional
    @Operation(summary = "Reject a leave allocation request")
    public ResponseEntity<LeaveAllocationRequestDTO> rejectAllocationRequest(
            @PathVariable Long id,
            @RequestBody(required = false) RejectLeaveRequest body) {
        LeaveAllocationRequest req = allocationRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveAllocationRequest", id));
        req.setStatus(LeaveAllocationRequest.AllocationStatus.REJECTED);
        req.setRejectReason(body != null ? body.reason() : null);
        return ResponseEntity.ok(LeaveMapper.toDTO(allocationRequestRepository.save(req)));
    }

    // ─── Leave Restrictions ───────────────────────────────────────────────────

    @GetMapping("/restrictions")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List leave restrictions (company-scoped)")
    public ResponseEntity<List<LeaveRestrictionDTO>> listRestrictions() {
        var spec = ScopeFilter.<RestrictLeave>byCompany();
        List<RestrictLeave> result = spec != null
                ? restrictLeaveRepository.findAll(spec)
                : restrictLeaveRepository.findAll();
        return ResponseEntity.ok(result.stream().map(LeaveMapper::toDTO).toList());
    }

    @PostMapping("/restrictions")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a leave restriction")
    public ResponseEntity<RestrictLeave> createRestriction(@RequestBody RestrictLeave restriction) {
        if (restriction.getCompany() != null && restriction.getCompany().getId() != null) {
            restriction.setCompany(companyRepository.getReferenceById(restriction.getCompany().getId()));
        }
        return ResponseEntity.ok(restrictLeaveRepository.save(restriction));
    }

    @PutMapping("/restrictions/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a leave restriction")
    public ResponseEntity<RestrictLeave> updateRestriction(@PathVariable Long id, @RequestBody RestrictLeave updated) {
        RestrictLeave r = restrictLeaveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RestrictLeave", id));
        r.setTitle(updated.getTitle());
        r.setStartDate(updated.getStartDate());
        r.setEndDate(updated.getEndDate());
        r.setDescription(updated.getDescription());
        r.setDepartment(updated.getDepartment());
        return ResponseEntity.ok(restrictLeaveRepository.save(r));
    }

    @DeleteMapping("/restrictions/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a leave restriction")
    public ResponseEntity<Map<String, String>> deleteRestriction(@PathVariable Long id) {
        restrictLeaveRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Restriction deleted"));
    }

    // ─── Leave Request Comments ───────────────────────────────────────────────

    @GetMapping("/requests/{requestId}/comments")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get comments on a leave request")
    public ResponseEntity<List<LeaveRequestComment>> getLeaveRequestComments(@PathVariable Long requestId) {
        return ResponseEntity.ok(leaveRequestCommentRepository.findByLeaveRequestId(requestId));
    }

    @PostMapping("/requests/{requestId}/comments")
    @PreAuthorize("hasAuthority('leave:create')")
    @Transactional
    @Operation(summary = "Add a comment to a leave request")
    public ResponseEntity<LeaveRequestComment> addLeaveRequestComment(
            @PathVariable Long requestId, @RequestBody LeaveRequestComment comment) {
        comment.setLeaveRequest(leaveService.getRequestById(requestId));
        if (comment.getEmployee() != null && comment.getEmployee().getId() != null) {
            comment.setEmployee(employeeRepository.getReferenceById(comment.getEmployee().getId()));
        }
        return ResponseEntity.ok(leaveRequestCommentRepository.save(comment));
    }

    @DeleteMapping("/requests/comments/{id}")
    @PreAuthorize("hasAuthority('leave:delete')")
    @Operation(summary = "Delete a leave request comment")
    public ResponseEntity<Void> deleteLeaveRequestComment(@PathVariable Long id) {
        leaveRequestCommentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Leave Request Files ──────────────────────────────────────────────────

    @GetMapping("/requests/{requestId}/files")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List files attached to a leave request")
    public ResponseEntity<List<LeaveRequestFile>> getLeaveRequestFiles(@PathVariable Long requestId) {
        return ResponseEntity.ok(leaveRequestFileRepository.findByLeaveRequestId(requestId));
    }

    @PostMapping("/requests/{requestId}/files")
    @PreAuthorize("hasAuthority('leave:create')")
    @Transactional
    @Operation(summary = "Attach a file reference to a leave request")
    public ResponseEntity<LeaveRequestFile> addLeaveRequestFile(
            @PathVariable Long requestId, @RequestBody LeaveRequestFile file) {
        file.setLeaveRequest(leaveService.getRequestById(requestId));
        return ResponseEntity.ok(leaveRequestFileRepository.save(file));
    }

    @PostMapping("/requests/{requestId}/files/upload")
    @PreAuthorize("hasAuthority('leave:create')")
    @Transactional
    @Operation(summary = "Upload a file and attach it to a leave request")
    public ResponseEntity<LeaveRequestFile> uploadLeaveRequestFile(
            @PathVariable Long requestId,
            @RequestParam("file") MultipartFile file) throws IOException {
        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);
        String storedName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path dest = dir.resolve(storedName);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

        LeaveRequestFile lrf = new LeaveRequestFile();
        lrf.setLeaveRequest(leaveService.getRequestById(requestId));
        lrf.setFilePath(dest.toString());
        lrf.setFileName(file.getOriginalFilename());
        return ResponseEntity.ok(leaveRequestFileRepository.save(lrf));
    }

    @DeleteMapping("/requests/files/{id}")
    @PreAuthorize("hasAuthority('leave:delete')")
    @Operation(summary = "Remove a file attachment from a leave request")
    public ResponseEntity<Void> deleteLeaveRequestFile(@PathVariable Long id) {
        leaveRequestFileRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Allocation Request Comments ──────────────────────────────────────────

    @GetMapping("/allocation-requests/{requestId}/comments")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get comments on a leave allocation request")
    public ResponseEntity<List<LeaveAllocationRequestComment>> getAllocationRequestComments(@PathVariable Long requestId) {
        return ResponseEntity.ok(allocationRequestCommentRepository.findByAllocationRequestId(requestId));
    }

    @PostMapping("/allocation-requests/{requestId}/comments")
    @PreAuthorize("hasAuthority('leave:create')")
    @Transactional
    @Operation(summary = "Add a comment to a leave allocation request")
    public ResponseEntity<LeaveAllocationRequestComment> addAllocationRequestComment(
            @PathVariable Long requestId, @RequestBody LeaveAllocationRequestComment comment) {
        comment.setAllocationRequest(allocationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveAllocationRequest", requestId)));
        if (comment.getEmployee() != null && comment.getEmployee().getId() != null) {
            comment.setEmployee(employeeRepository.getReferenceById(comment.getEmployee().getId()));
        }
        return ResponseEntity.ok(allocationRequestCommentRepository.save(comment));
    }

    // ─── Leave Request Condition Approvals ────────────────────────────────────

    @GetMapping("/requests/{requestId}/condition-approvals")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get multi-step condition approvals for a leave request")
    public ResponseEntity<List<LeaveRequestConditionApproval>> getConditionApprovals(@PathVariable Long requestId) {
        return ResponseEntity.ok(conditionApprovalRepository.findByLeaveRequestIdOrderBySequenceAsc(requestId));
    }

    @PostMapping("/requests/{requestId}/condition-approvals")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Add a condition approver to a leave request")
    public ResponseEntity<LeaveRequestConditionApproval> addConditionApproval(
            @PathVariable Long requestId, @RequestBody LeaveRequestConditionApproval approval) {
        approval.setLeaveRequest(leaveService.getRequestById(requestId));
        if (approval.getManager() != null && approval.getManager().getId() != null) {
            approval.setManager(employeeRepository.getReferenceById(approval.getManager().getId()));
        }
        return ResponseEntity.ok(conditionApprovalRepository.save(approval));
    }

    @PostMapping("/requests/condition-approvals/{id}/approve")
    @PreAuthorize("hasAuthority('leave:approve')")
    @Transactional
    @Operation(summary = "Mark a condition approval step as approved")
    public ResponseEntity<LeaveRequestConditionApproval> approveConditionStep(@PathVariable Long id) {
        LeaveRequestConditionApproval step = conditionApprovalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequestConditionApproval", id));
        step.setIsApproved(true);
        step.setIsRejected(false);
        return ResponseEntity.ok(conditionApprovalRepository.save(step));
    }

    @PostMapping("/requests/condition-approvals/{id}/reject")
    @PreAuthorize("hasAuthority('leave:approve')")
    @Transactional
    @Operation(summary = "Mark a condition approval step as rejected")
    public ResponseEntity<LeaveRequestConditionApproval> rejectConditionStep(@PathVariable Long id) {
        LeaveRequestConditionApproval step = conditionApprovalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequestConditionApproval", id));
        step.setIsRejected(true);
        step.setIsApproved(false);
        return ResponseEntity.ok(conditionApprovalRepository.save(step));
    }

    // ─── Employee Past Leave Restrict ─────────────────────────────────────────

    @GetMapping("/past-leave-restrict")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get past leave restriction setting for company")
    public ResponseEntity<EmployeePastLeaveRestrict> getPastLeaveRestrict(@RequestParam Long companyId) {
        return pastLeaveRestrictRepository.findByCompanyId(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/past-leave-restrict")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Upsert past leave restriction setting")
    public ResponseEntity<EmployeePastLeaveRestrict> upsertPastLeaveRestrict(
            @RequestParam Long companyId, @RequestBody EmployeePastLeaveRestrict body) {
        EmployeePastLeaveRestrict r = pastLeaveRestrictRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    EmployeePastLeaveRestrict n = new EmployeePastLeaveRestrict();
                    n.setCompany(companyRepository.getReferenceById(companyId));
                    return n;
                });
        r.setEnabled(body.getEnabled());
        return ResponseEntity.ok(pastLeaveRestrictRepository.save(r));
    }

    // ─── Compensatory Leave Requests ──────────────────────────────────────────

    @GetMapping("/compensatory-requests")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<CompensatoryLeaveRequestDTO>> listCompensatoryRequests(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) CompensatoryLeaveRequest.CompensatoryLeaveStatus status) {
        List<CompensatoryLeaveRequest> result;
        if (employeeId != null) {
            result = compensatoryLeaveRequestRepository.findByEmployeeId(employeeId);
        } else if (status != null) {
            result = compensatoryLeaveRequestRepository.findByStatus(status);
        } else {
            result = compensatoryLeaveRequestRepository.findAll();
        }
        return ResponseEntity.ok(result.stream().map(LeaveMapper::toDTO).toList());
    }

    @PostMapping("/compensatory-requests")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<CompensatoryLeaveRequestDTO> createCompensatoryRequest(
            @RequestBody CompensatoryLeaveRequest request) {
        request.setStatus(CompensatoryLeaveRequest.CompensatoryLeaveStatus.REQUESTED);
        return ResponseEntity.ok(LeaveMapper.toDTO(compensatoryLeaveRequestRepository.save(request)));
    }

    @PutMapping("/compensatory-requests/{id}/approve")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')")
    @Transactional
    public ResponseEntity<CompensatoryLeaveRequestDTO> approveCompensatoryRequest(@PathVariable Long id) {
        CompensatoryLeaveRequest req = compensatoryLeaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CompensatoryLeaveRequest", id));
        req.setStatus(CompensatoryLeaveRequest.CompensatoryLeaveStatus.APPROVED);
        return ResponseEntity.ok(LeaveMapper.toDTO(compensatoryLeaveRequestRepository.save(req)));
    }

    @PutMapping("/compensatory-requests/{id}/reject")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')")
    @Transactional
    public ResponseEntity<CompensatoryLeaveRequestDTO> rejectCompensatoryRequest(
            @PathVariable Long id, @RequestBody(required = false) RejectLeaveRequest body) {
        CompensatoryLeaveRequest req = compensatoryLeaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CompensatoryLeaveRequest", id));
        req.setStatus(CompensatoryLeaveRequest.CompensatoryLeaveStatus.REJECTED);
        if (body != null && body.reason() != null) req.setRejectReason(body.reason());
        return ResponseEntity.ok(LeaveMapper.toDTO(compensatoryLeaveRequestRepository.save(req)));
    }

    @GetMapping("/compensatory-requests/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<com.example.demo.leave.entity.CompensatoryLeaveRequestComment>> listCompensatoryComments(@PathVariable Long id) {
        return ResponseEntity.ok(compensatoryLeaveRequestCommentRepository.findByRequestId(id));
    }

    @PostMapping("/compensatory-requests/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<com.example.demo.leave.entity.CompensatoryLeaveRequestComment> addCompensatoryComment(
            @PathVariable Long id, @RequestBody com.example.demo.leave.entity.CompensatoryLeaveRequestComment comment) {
        comment.setRequest(compensatoryLeaveRequestRepository.getReferenceById(id));
        return ResponseEntity.ok(compensatoryLeaveRequestCommentRepository.save(comment));
    }

    // ─── Leave General Settings ───────────────────────────────────────────────

    @GetMapping("/general-settings")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get leave general settings for current company")
    public ResponseEntity<LeaveGeneralSetting> getGeneralSettings(@RequestParam Long companyId) {
        return generalSettingRepository.findByCompanyId(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/general-settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update leave general settings")
    public ResponseEntity<LeaveGeneralSetting> updateGeneralSettings(@RequestParam Long companyId,
                                                                       @RequestBody LeaveGeneralSetting updated) {
        LeaveGeneralSetting s = generalSettingRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    LeaveGeneralSetting n = new LeaveGeneralSetting();
                    n.setCompany(companyRepository.getReferenceById(companyId));
                    return n;
                });
        s.setCompensatoryLeave(updated.getCompensatoryLeave());
        s.setAnnualCarryforwardEnabled(updated.getAnnualCarryforwardEnabled());
        s.setMaxCarryforwardDays(updated.getMaxCarryforwardDays());
        return ResponseEntity.ok(generalSettingRepository.save(s));
    }

    // ─── Holidays ─────────────────────────────────────────────────────────────

    @GetMapping("/holidays")
    @PreAuthorize("hasAuthority('leave:view')")
    @Operation(summary = "List holidays for a company")
    public ResponseEntity<List<Holiday>> listHolidays(@RequestParam Long companyId) {
        return ResponseEntity.ok(holidayRepository.findByCompanyId(companyId));
    }

    @PostMapping("/holidays")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a holiday")
    public ResponseEntity<Holiday> createHoliday(@RequestBody Holiday body, @RequestParam Long companyId) {
        if (TenantContext.DEFAULT_TENANT.equals(TenantContext.getTenant())) {
            throw new BadRequestException("X-Company-Id header is required to create a holiday");
        }
        body.setCompany(companyRepository.getReferenceById(companyId));
        return ResponseEntity.ok(holidayRepository.save(body));
    }

    @PutMapping("/holidays/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a holiday")
    public ResponseEntity<Holiday> updateHoliday(@PathVariable Long id, @RequestBody Holiday body) {
        Holiday h = holidayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Holiday", id));
        h.setName(body.getName());
        h.setStartDate(body.getStartDate());
        h.setEndDate(body.getEndDate());
        h.setRecurring(body.getRecurring());
        return ResponseEntity.ok(holidayRepository.save(h));
    }

    @DeleteMapping("/holidays/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a holiday")
    public ResponseEntity<Map<String, String>> deleteHoliday(@PathVariable Long id) {
        holidayRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Holiday deleted"));
    }

    // ─── Holiday Allocations ──────────────────────────────────────────────────

    @GetMapping("/holiday-allocations")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List holiday allocations for a company")
    public ResponseEntity<List<Map<String, Object>>> listHolidayAllocations(@RequestParam Long companyId) {
        List<HolidayAllocation> allocations = holidayAllocationRepository.findByCompanyId(companyId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (HolidayAllocation ha : allocations) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", ha.getId());
            m.put("holidayId", ha.getHoliday().getId());
            m.put("holidayName", ha.getHoliday().getName());
            m.put("startDate", ha.getHoliday().getStartDate());
            m.put("endDate", ha.getHoliday().getEndDate());
            if (ha.getEmployee() != null) {
                m.put("type", "employee");
                m.put("targetId", ha.getEmployee().getId());
                m.put("targetName", ha.getEmployee().getFirstName() + " " + (ha.getEmployee().getLastName() != null ? ha.getEmployee().getLastName() : ""));
            } else if (ha.getDepartment() != null) {
                m.put("type", "department");
                m.put("targetId", ha.getDepartment().getId());
                m.put("targetName", ha.getDepartment().getName());
            }
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/holiday-allocations")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Allocate a holiday to employees or a department")
    public ResponseEntity<Map<String, Object>> createHolidayAllocation(@RequestBody Map<String, Object> body,
                                                                        @RequestParam Long companyId) {
        Long holidayId = Long.valueOf(body.get("holidayId").toString());
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        List<Long> accessibleCompanyIds = (scope != null && !scope.hasUnrestrictedAccess())
                ? scope.getAccessibleCompanyIds()
                : List.of(companyId);
        Holiday holiday = holidayRepository.findByIdAndCompanyIdIn(holidayId, accessibleCompanyIds)
                .orElseThrow(() -> new ResourceNotFoundException("Holiday", holidayId));

        int created = 0;
        int skipped = 0;

        boolean allEmployees = Boolean.TRUE.equals(body.get("allEmployees"));
        Object deptIdRaw = body.get("departmentId");
        Object empIdsRaw = body.get("employeeIds");

        if (allEmployees) {
            List<Employee> employees = employeeRepository.findByCompanyIdAndIsActiveTrue(companyId);
            for (Employee emp : employees) {
                if (!holidayAllocationRepository.existsByHolidayIdAndEmployeeId(holidayId, emp.getId())) {
                    HolidayAllocation ha = new HolidayAllocation();
                    ha.setHoliday(holiday);
                    ha.setEmployee(emp);
                    ha.setCompany(companyRepository.getReferenceById(companyId));
                    holidayAllocationRepository.save(ha);
                    created++;
                } else {
                    skipped++;
                }
            }
            return ResponseEntity.ok(Map.of("created", created, "skipped", skipped));
        }

        if (deptIdRaw != null) {
            Long deptId = Long.valueOf(deptIdRaw.toString());
            Department dept = departmentRepository.findById(deptId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department", deptId));
            if (!holidayAllocationRepository.existsByHolidayIdAndDepartmentId(holidayId, deptId)) {
                HolidayAllocation ha = new HolidayAllocation();
                ha.setHoliday(holiday);
                ha.setDepartment(dept);
                ha.setCompany(companyRepository.getReferenceById(companyId));
                holidayAllocationRepository.save(ha);
                created++;
            } else {
                skipped++;
            }
        }

        if (empIdsRaw instanceof List<?> empIdList) {
            for (Object idObj : empIdList) {
                Long empId = Long.valueOf(idObj.toString());
                if (!holidayAllocationRepository.existsByHolidayIdAndEmployeeId(holidayId, empId)) {
                    HolidayAllocation ha = new HolidayAllocation();
                    ha.setHoliday(holiday);
                    ha.setEmployee(employeeRepository.getReferenceById(empId));
                    ha.setCompany(companyRepository.getReferenceById(companyId));
                    holidayAllocationRepository.save(ha);
                    created++;
                } else {
                    skipped++;
                }
            }
        }

        return ResponseEntity.ok(Map.of("created", created, "skipped", skipped));
    }

    @DeleteMapping("/holiday-allocations/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Remove a holiday allocation")
    public ResponseEntity<Map<String, String>> deleteHolidayAllocation(@PathVariable Long id) {
        holidayAllocationRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Allocation removed"));
    }

    // ─── Company Leaves ───────────────────────────────────────────────────────

    @GetMapping("/company-leaves")
    @PreAuthorize("hasAuthority('leave:view')")
    @Operation(summary = "List company leaves for a company")
    public ResponseEntity<List<CompanyLeave>> listCompanyLeaves(@RequestParam Long companyId) {
        return ResponseEntity.ok(companyLeaveRepository.findByCompanyId(companyId));
    }

    @PostMapping("/company-leaves")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a company leave")
    public ResponseEntity<CompanyLeave> createCompanyLeave(@RequestBody CompanyLeave body, @RequestParam Long companyId) {
        body.setCompany(companyRepository.getReferenceById(companyId));
        return ResponseEntity.ok(companyLeaveRepository.save(body));
    }

    @PutMapping("/company-leaves/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a company leave")
    public ResponseEntity<CompanyLeave> updateCompanyLeave(@PathVariable Long id, @RequestBody CompanyLeave body) {
        CompanyLeave cl = companyLeaveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CompanyLeave", id));
        cl.setName(body.getName());
        cl.setBasedOnWeekDay(body.getBasedOnWeekDay());
        cl.setWeekDay(body.getWeekDay());
        cl.setStartDate(body.getStartDate());
        cl.setEndDate(body.getEndDate());
        return ResponseEntity.ok(companyLeaveRepository.save(cl));
    }

    @DeleteMapping("/company-leaves/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a company leave")
    public ResponseEntity<Map<String, String>> deleteCompanyLeave(@PathVariable Long id) {
        companyLeaveRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Company leave deleted"));
    }

    // ─── Clash Check ──────────────────────────────────────────────────────────

    @GetMapping("/clash-check")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Check for leave clashes for an employee in a date range")
    public ResponseEntity<Map<String, Object>> checkClash(
            @RequestParam Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<LeaveRequest> all = leaveRequestRepository.findByEmployeeId(employeeId);
        List<LeaveRequest> conflicts = new ArrayList<>();
        for (LeaveRequest lr : all) {
            if (lr.getStatus() == LeaveRequest.LeaveStatus.REJECTED
                    || lr.getStatus() == LeaveRequest.LeaveStatus.CANCELLED) {
                continue;
            }
            if (!lr.getStartDate().isAfter(to) && !lr.getEndDate().isBefore(from)) {
                conflicts.add(lr);
            }
        }
        Map<String, Object> result = new HashMap<>();
        result.put("clash", !conflicts.isEmpty());
        result.put("conflicts", conflicts.stream().map(LeaveMapper::toDTO).toList());
        return ResponseEntity.ok(result);
    }

    // ─── Export Allocations ───────────────────────────────────────────────────

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('leave:view')")
    @Operation(summary = "Export leave allocations as Excel")
    public void exportAllocations(@RequestParam Long companyId, HttpServletResponse response) throws IOException {
        List<LeaveAllocation> allocations = leaveAllocationRepository.findByCompanyId(companyId);
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=leave_allocations.xlsx");
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Leave Allocations");
            Row header = sheet.createRow(0);
            String[] cols = {"Employee", "Leave Type", "Start Date", "End Date", "Days"};
            for (int i = 0; i < cols.length; i++) {
                header.createCell(i).setCellValue(cols[i]);
            }
            int rowNum = 1;
            for (LeaveAllocation a : allocations) {
                Row row = sheet.createRow(rowNum++);
                String empName = a.getEmployee() != null
                        ? a.getEmployee().getFirstName() + " " + a.getEmployee().getLastName()
                        : "";
                String leaveTypeName = a.getLeaveType() != null ? a.getLeaveType().getName() : "";
                row.createCell(0).setCellValue(empName);
                row.createCell(1).setCellValue(leaveTypeName);
                row.createCell(2).setCellValue(a.getYear() != null ? a.getYear().toString() : "");
                row.createCell(3).setCellValue(a.getYear() != null ? a.getYear().toString() : "");
                row.createCell(4).setCellValue(a.getTotalLeaveDays() != null ? a.getTotalLeaveDays() : 0.0);
            }
            workbook.write(response.getOutputStream());
        }
    }

    // ─── Import Allocations ───────────────────────────────────────────────────

    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Import leave allocations from Excel")
    public ResponseEntity<Map<String, Object>> importAllocations(
            @RequestParam("file") MultipartFile file,
            @RequestParam Long companyId) throws IOException {
        com.example.demo.base.entity.Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new com.example.demo.common.exception.ResourceNotFoundException("Company", companyId));

        int imported = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        try (XSSFWorkbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            // Resolve header columns from row 0
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                return ResponseEntity.badRequest().body(Map.<String, Object>of("message", "Empty file", "imported", 0, "failed", 0));
            }
            Map<String, Integer> colIndex = new HashMap<>();
            for (int c = 0; c <= headerRow.getLastCellNum(); c++) {
                Cell hCell = headerRow.getCell(c);
                if (hCell != null) {
                    colIndex.put(getCellStringValue(hCell).trim().toLowerCase(), c);
                }
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                try {
                    // Employee — matched by "employee id", "badge id", or "employee"
                    String empRaw = getColValue(row, colIndex, "employee id", "badge id", "employee");
                    if (empRaw == null || empRaw.isBlank()) { failed++; errors.add("Row " + (i+1) + ": missing employee"); continue; }
                    Employee employee = null;
                    try {
                        long empId = Long.parseLong(empRaw.trim());
                        employee = employeeRepository.findById(empId).orElse(null);
                    } catch (NumberFormatException ignored) {}
                    if (employee == null) {
                        // Try badge_id lookup
                        List<Employee> byBadge = employeeRepository.findAll().stream()
                                .filter(e -> empRaw.trim().equalsIgnoreCase(e.getBadgeId()))
                                .toList();
                        if (!byBadge.isEmpty()) employee = byBadge.get(0);
                    }
                    if (employee == null) { failed++; errors.add("Row " + (i+1) + ": employee not found: " + empRaw); continue; }

                    // Leave type — by "leave type" column
                    String ltRaw = getColValue(row, colIndex, "leave type");
                    if (ltRaw == null || ltRaw.isBlank()) { failed++; errors.add("Row " + (i+1) + ": missing leave type"); continue; }
                    LeaveType leaveType = null;
                    try {
                        long ltId = Long.parseLong(ltRaw.trim());
                        leaveType = leaveTypeRepository.findById(ltId).orElse(null);
                    } catch (NumberFormatException ignored) {}
                    if (leaveType == null) {
                        String ltName = ltRaw.trim();
                        leaveType = leaveTypeRepository.findByCompanyId(companyId).stream()
                                .filter(lt -> lt.getName() != null && lt.getName().equalsIgnoreCase(ltName))
                                .findFirst().orElse(null);
                    }
                    if (leaveType == null) { failed++; errors.add("Row " + (i+1) + ": leave type not found: " + ltRaw); continue; }

                    // Year
                    String yearRaw = getColValue(row, colIndex, "year");
                    int year = (yearRaw != null && !yearRaw.isBlank())
                            ? (int) Double.parseDouble(yearRaw.trim())
                            : LocalDate.now().getYear();

                    // Total days
                    String totalRaw = getColValue(row, colIndex, "total days", "total_leave_days", "days");
                    double totalDays = (totalRaw != null && !totalRaw.isBlank()) ? Double.parseDouble(totalRaw.trim()) : 0.0;

                    // Optional fields
                    String availRaw = getColValue(row, colIndex, "available days", "available_days");
                    Double availDays = (availRaw != null && !availRaw.isBlank()) ? Double.parseDouble(availRaw.trim()) : totalDays;

                    String cfRaw = getColValue(row, colIndex, "carryforward days", "carryforward_days");
                    Double cfDays = (cfRaw != null && !cfRaw.isBlank()) ? Double.parseDouble(cfRaw.trim()) : 0.0;

                    String statusRaw = getColValue(row, colIndex, "status");
                    LeaveAllocation.AllocationStatus status = LeaveAllocation.AllocationStatus.ACTIVE;
                    if (statusRaw != null && statusRaw.trim().equalsIgnoreCase("EXPIRED")) {
                        status = LeaveAllocation.AllocationStatus.EXPIRED;
                    }

                    // Upsert: reuse existing record for same employee/leaveType/year
                    LeaveAllocation allocation = leaveAllocationRepository
                            .findByEmployeeIdAndLeaveTypeIdAndYear(employee.getId(), leaveType.getId(), year)
                            .orElseGet(LeaveAllocation::new);
                    allocation.setEmployee(employee);
                    allocation.setLeaveType(leaveType);
                    allocation.setYear(year);
                    allocation.setTotalLeaveDays(totalDays);
                    allocation.setAvailableDays(availDays);
                    allocation.setCarryforwardDays(cfDays);
                    allocation.setStatus(status);
                    allocation.setCompany(company);
                    leaveAllocationRepository.save(allocation);
                    imported++;

                } catch (Exception ex) {
                    failed++;
                    errors.add("Row " + (i+1) + ": " + ex.getMessage());
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Import completed");
        result.put("imported", imported);
        result.put("failed", failed);
        result.put("errors", errors);
        return ResponseEntity.ok(result);
    }

    private String getColValue(Row row, Map<String, Integer> colIndex, String... candidates) {
        for (String key : candidates) {
            Integer idx = colIndex.get(key.toLowerCase());
            if (idx != null) {
                Cell cell = row.getCell(idx);
                if (cell != null) return getCellStringValue(cell);
            }
        }
        return null;
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                yield (d == Math.floor(d)) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try { yield String.valueOf(cell.getNumericCellValue()); }
                catch (Exception e) { yield cell.getStringCellValue(); }
            }
            default -> "";
        };
    }

    // ─── Export Holidays ──────────────────────────────────────────────────────

    @GetMapping("/holidays/export")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Export holidays as Excel")
    public void exportHolidays(@RequestParam Long companyId, HttpServletResponse response) throws IOException {
        List<Holiday> holidays = holidayRepository.findByCompanyId(companyId);
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=holidays.xlsx");
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Holidays");
            Row header = sheet.createRow(0);
            String[] cols = {"Name", "Start Date", "End Date", "Recurring"};
            for (int i = 0; i < cols.length; i++) {
                header.createCell(i).setCellValue(cols[i]);
            }
            int rowNum = 1;
            for (Holiday h : holidays) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(h.getName() != null ? h.getName() : "");
                row.createCell(1).setCellValue(h.getStartDate() != null ? h.getStartDate().toString() : "");
                row.createCell(2).setCellValue(h.getEndDate() != null ? h.getEndDate().toString() : "");
                row.createCell(3).setCellValue(Boolean.TRUE.equals(h.getRecurring()) ? "Yes" : "No");
            }
            workbook.write(response.getOutputStream());
        }
    }

    // ─── Import Holidays ──────────────────────────────────────────────────────

    @PostMapping("/holidays/import")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Import holidays from Excel")
    public ResponseEntity<Map<String, Object>> importHolidays(
            @RequestParam("file") MultipartFile file,
            @RequestParam Long companyId) throws IOException {
        if (TenantContext.DEFAULT_TENANT.equals(TenantContext.getTenant())) {
            throw new BadRequestException("X-Company-Id header is required to import holidays");
        }
        int imported = 0;
        List<String> errors = new ArrayList<>();
        try (XSSFWorkbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                try {
                    Cell nameCell = row.getCell(0);
                    Cell startCell = row.getCell(1);
                    Cell endCell = row.getCell(2);
                    Cell recurringCell = row.getCell(3);

                    if (nameCell == null || nameCell.getCellType() == CellType.BLANK) {
                        errors.add("Row " + (i + 1) + ": Name is required");
                        continue;
                    }
                    String name = nameCell.getStringCellValue().trim();

                    if (startCell == null || startCell.getCellType() == CellType.BLANK) {
                        errors.add("Row " + (i + 1) + ": Start Date is required");
                        continue;
                    }
                    LocalDate startDate = LocalDate.parse(startCell.getStringCellValue().trim());

                    LocalDate endDate = null;
                    if (endCell != null && endCell.getCellType() != CellType.BLANK) {
                        endDate = LocalDate.parse(endCell.getStringCellValue().trim());
                    }

                    boolean recurring = false;
                    if (recurringCell != null && recurringCell.getCellType() != CellType.BLANK) {
                        String recurringVal = recurringCell.getStringCellValue().trim().toLowerCase();
                        recurring = "true".equals(recurringVal) || "yes".equals(recurringVal);
                    }

                    Holiday holiday = new Holiday();
                    holiday.setName(name);
                    holiday.setStartDate(startDate);
                    holiday.setEndDate(endDate);
                    holiday.setRecurring(recurring);
                    holiday.setCompany(companyRepository.getReferenceById(companyId));
                    holidayRepository.save(holiday);
                    imported++;
                } catch (Exception e) {
                    errors.add("Row " + (i + 1) + ": " + e.getMessage());
                }
            }
        }
        Map<String, Object> result = new HashMap<>();
        result.put("imported", imported);
        result.put("errors", errors);
        return ResponseEntity.ok(result);
    }

    // ─── Accrual Log ──────────────────────────────────────────────────────────

    @GetMapping("/accrual-log")
    @PreAuthorize("hasAuthority('leave:view')")
    @Operation(summary = "Get accrual history for an employee (optionally filtered by leave type)")
    public ResponseEntity<List<LeaveAccrualLog>> getAccrualLog(
            @RequestParam Long employeeId,
            @RequestParam(required = false) Long leaveTypeId) {
        List<LeaveAccrualLog> logs = leaveTypeId != null
                ? accrualLogRepository.findByEmployeeIdAndLeaveTypeIdOrderByAccrualDateDesc(employeeId, leaveTypeId)
                : accrualLogRepository.findByEmployeeIdOrderByAccrualDateDesc(employeeId);
        return ResponseEntity.ok(logs);
    }

    @PostMapping("/accrual/run")
    @PreAuthorize("hasAuthority('leave:manage')")
    @Operation(summary = "Manually trigger monthly accrual for a specific date (defaults to today)")
    public ResponseEntity<Map<String, Object>> runAccrual(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        int posted = leaveAccrualService.processMonthlyAccrual(target);
        return ResponseEntity.ok(Map.of("posted", posted, "date", target.toString()));
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get leave dashboard stats for a company, optionally filtered by month (yyyy-MM)")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @RequestParam Long companyId,
            @RequestParam(required = false) String month) {
        List<LeaveRequest> all = leaveRequestRepository.findByCompanyId(companyId);

        // Filter by month if provided (format: yyyy-MM)
        List<LeaveRequest> filtered = all;
        if (month != null && !month.isBlank()) {
            filtered = all.stream()
                    .filter(r -> r.getStartDate() != null && r.getStartDate().toString().startsWith(month))
                    .collect(java.util.stream.Collectors.toList());
        }

        long total = filtered.size();
        long pending = filtered.stream().filter(r -> r.getStatus() == LeaveRequest.LeaveStatus.REQUESTED).count();
        long approved = filtered.stream().filter(r -> r.getStatus() == LeaveRequest.LeaveStatus.APPROVED).count();
        long rejected = filtered.stream().filter(r -> r.getStatus() == LeaveRequest.LeaveStatus.REJECTED).count();

        // Monthly trend — 6 months ending at the selected month (or current month)
        LocalDate trendRef = (month != null && !month.isBlank())
                ? LocalDate.parse(month + "-01")
                : LocalDate.now();
        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate d = trendRef.minusMonths(i).withDayOfMonth(1);
            String ym = d.toString().substring(0, 7);
            String label = d.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH);
            List<LeaveRequest> monthLeaves = all.stream()
                    .filter(r -> r.getStartDate() != null && r.getStartDate().toString().startsWith(ym))
                    .collect(java.util.stream.Collectors.toList());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("month", label);
            m.put("approved", monthLeaves.stream().filter(r -> r.getStatus() == LeaveRequest.LeaveStatus.APPROVED).count());
            m.put("rejected", monthLeaves.stream().filter(r -> r.getStatus() == LeaveRequest.LeaveStatus.REJECTED).count());
            m.put("pending", monthLeaves.stream().filter(r -> r.getStatus() == LeaveRequest.LeaveStatus.REQUESTED).count());
            monthlyTrend.add(m);
        }

        // Department-wise breakdown (from filtered set)
        Map<String, Long> deptMap = new LinkedHashMap<>();
        for (LeaveRequest r : filtered) {
            if (r.getEmployee() != null && r.getEmployee().getDepartment() != null) {
                String deptName = r.getEmployee().getDepartment().getName();
                deptMap.merge(deptName, 1L, Long::sum);
            }
        }
        List<Map<String, Object>> departmentBreakdown = deptMap.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("department", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                }).collect(java.util.stream.Collectors.toList());

        // Weekly breakdown — current week (Mon-Sun)
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
        List<Map<String, Object>> weeklyBreakdown = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate day = weekStart.plusDays(i);
            long count = all.stream()
                    .filter(r -> r.getStartDate() != null && !r.getStartDate().isAfter(day)
                            && r.getEndDate() != null && !r.getEndDate().isBefore(day)
                            && r.getStatus() == LeaveRequest.LeaveStatus.APPROVED)
                    .count();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("day", day.getDayOfWeek().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH));
            m.put("date", day.toString());
            m.put("onLeave", count);
            weeklyBreakdown.add(m);
        }

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalRequests", total);
        dashboard.put("pendingRequests", pending);
        dashboard.put("approvedRequests", approved);
        dashboard.put("rejectedRequests", rejected);
        dashboard.put("monthlyTrend", monthlyTrend);
        dashboard.put("departmentBreakdown", departmentBreakdown);
        dashboard.put("weeklyBreakdown", weeklyBreakdown);
        return ResponseEntity.ok(dashboard);
    }
}
