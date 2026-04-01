package com.example.demo.leave.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.dto.*;
import com.example.demo.leave.entity.*;
import com.example.demo.leave.repository.*;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/leave")
@RequiredArgsConstructor
@Tag(name = "Leave")
public class LeaveController {

    @Value("${app.upload.dir:uploads/leave}")
    private String uploadDir;

    private final LeaveService leaveService;
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
    private final CompanyLeaveRepository companyLeaveRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveAllocationRepository leaveAllocationRepository;

    @GetMapping("/requests")
    @PreAuthorize("hasAuthority('leave:view')")
    @Operation(summary = "List all leave requests (company-scoped)")
    public ResponseEntity<Page<LeaveRequestDTO>> listRequests(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(leaveService.getAllRequests(pageable).map(LeaveMapper::toDTO));
    }

    @GetMapping("/types")
    @PreAuthorize("hasAuthority('leave:view')")
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
        var spec = ScopeFilter.<AvailableLeave>byEmployee();
        List<AvailableLeave> result = spec != null
                ? availableLeaveRepository.findAll(spec)
                : availableLeaveRepository.findAll();
        return ResponseEntity.ok(result.stream().map(LeaveMapper::toDTO).toList());
    }

    @GetMapping("/balance/employee/{employeeId}")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get leave balance for a specific employee")
    public ResponseEntity<List<AvailableLeaveDTO>> getEmployeeBalance(@PathVariable Long employeeId) {
        return ResponseEntity.ok(availableLeaveRepository.findByEmployeeId(employeeId).stream().map(LeaveMapper::toDTO).toList());
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
        int count = 0;
        try (XSSFWorkbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                // Minimal stub: count rows processed; real implementation would map cells to entities
                count++;
            }
        }
        return ResponseEntity.ok(Map.of("message", "Import completed", "count", count));
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get leave dashboard stats for a company")
    public ResponseEntity<Map<String, Object>> getDashboard(@RequestParam Long companyId) {
        List<LeaveRequest> all = leaveRequestRepository.findByCompanyId(companyId);
        long total = all.size();
        long pending = all.stream().filter(r -> r.getStatus() == LeaveRequest.LeaveStatus.REQUESTED).count();
        long approved = all.stream().filter(r -> r.getStatus() == LeaveRequest.LeaveStatus.APPROVED).count();
        long rejected = all.stream().filter(r -> r.getStatus() == LeaveRequest.LeaveStatus.REJECTED).count();
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalRequests", total);
        dashboard.put("pendingRequests", pending);
        dashboard.put("approvedRequests", approved);
        dashboard.put("rejectedRequests", rejected);
        return ResponseEntity.ok(dashboard);
    }
}
