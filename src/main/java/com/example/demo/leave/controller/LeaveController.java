package com.example.demo.leave.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.demo.auth.security.UserPrincipal;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
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

    @GetMapping("/requests")
    @PreAuthorize("hasAuthority('leave:view')")
    @Operation(summary = "List all leave requests (company-scoped)")
    public ResponseEntity<Page<LeaveRequest>> listRequests(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(leaveService.getAllRequests(pageable));
    }

    @GetMapping("/types")
    @PreAuthorize("hasAuthority('leave:view')")
    @Operation(summary = "Get leave types for company")
    public ResponseEntity<List<LeaveType>> getTypes() {
        return ResponseEntity.ok(leaveService.getLeaveTypes());
    }

    @PostMapping("/types")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Create a leave type (isOrganizationWide=true requires Head Office access)")
    public ResponseEntity<LeaveType> createLeaveType(@RequestBody LeaveType leaveType) {
        return ResponseEntity.ok(leaveService.createLeaveType(leaveType));
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
    public ResponseEntity<LeaveRequest> apply(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Long employeeId,
            @RequestParam Long leaveTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String description,
            @RequestParam Long companyId) {
        Long resolvedEmployeeId = employeeId != null ? employeeId
                : employeeRepository.findByUserId(principal.getId())
                        .map(e -> e.getId())
                        .orElseThrow(() -> new com.example.demo.common.exception.ResourceNotFoundException("Employee record not found for current user"));
        return ResponseEntity.ok(leaveService.applyLeave(resolvedEmployeeId, leaveTypeId, startDate, endDate, description, companyId));
    }

    @PostMapping("/requests/{id}/approve")
    @PreAuthorize("hasAuthority('leave:approve')")
    @Operation(summary = "Approve leave request")
    public ResponseEntity<LeaveRequest> approve(@PathVariable Long id) {
        return ResponseEntity.ok(leaveService.approve(id));
    }

    @PostMapping("/requests/{id}/reject")
    @PreAuthorize("hasAuthority('leave:approve')")
    @Operation(summary = "Reject leave request")
    public ResponseEntity<LeaveRequest> reject(@PathVariable Long id, @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(leaveService.reject(id, reason));
    }

    @PostMapping("/requests/{id}/cancel")
    @PreAuthorize("hasAuthority('leave:create')")
    @Operation(summary = "Cancel a leave request (employee self-cancel, restores balance if approved)")
    public ResponseEntity<LeaveRequest> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(leaveService.cancel(id));
    }

    @GetMapping("/allocations")
    @PreAuthorize("hasAuthority('leave:view')")
    @Operation(summary = "List leave allocations (company-scoped)")
    public ResponseEntity<List<LeaveAllocation>> listAllocations(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(leaveService.getAllocations(employeeId, year));
    }

    @PostMapping("/allocate")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Allocate leave days to employee")
    public ResponseEntity<Map<String, String>> allocate(
            @RequestParam Long employeeId,
            @RequestParam Long leaveTypeId,
            @RequestParam double days,
            @RequestParam int year,
            @RequestParam Long companyId) {
        leaveService.allocateLeave(employeeId, leaveTypeId, days, year, companyId);
        return ResponseEntity.ok(Map.of("message", "Leave allocated successfully"));
    }

    @PostMapping("/allocate/bulk")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Bulk-allocate leave days to all active employees in a company")
    public ResponseEntity<Map<String, String>> bulkAllocate(
            @RequestParam Long companyId,
            @RequestParam Long leaveTypeId,
            @RequestParam double days,
            @RequestParam int year) {
        leaveService.bulkAllocate(companyId, leaveTypeId, days, year);
        return ResponseEntity.ok(Map.of("message", "Bulk allocation completed"));
    }

    @PostMapping("/reset/annual")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Run annual leave reset with carry-forward logic for all employees in a company")
    public ResponseEntity<Map<String, String>> annualReset(
            @RequestParam Long companyId,
            @RequestParam int year) {
        leaveService.annualReset(companyId, year);
        return ResponseEntity.ok(Map.of("message", "Annual reset completed for year " + year));
    }

    // ─── Leave Balance (AvailableLeave) ──────────────────────────────────────

    @GetMapping("/balance")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get leave balance for all employees (company-scoped)")
    public ResponseEntity<List<AvailableLeave>> listBalance() {
        var spec = ScopeFilter.<AvailableLeave>byEmployee();
        return ResponseEntity.ok(spec != null ? availableLeaveRepository.findAll(spec) : availableLeaveRepository.findAll());
    }

    @GetMapping("/balance/employee/{employeeId}")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get leave balance for a specific employee")
    public ResponseEntity<List<AvailableLeave>> getEmployeeBalance(@PathVariable Long employeeId) {
        return ResponseEntity.ok(availableLeaveRepository.findByEmployeeId(employeeId));
    }

    @PostMapping("/balance/credit")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Credit leave days to an employee's balance")
    public ResponseEntity<AvailableLeave> creditBalance(
            @RequestParam Long employeeId,
            @RequestParam Long leaveTypeId,
            @RequestParam double days) {
        AvailableLeave al = availableLeaveRepository.findByEmployeeIdAndLeaveTypeId(employeeId, leaveTypeId)
                .orElseGet(() -> {
                    AvailableLeave n = new AvailableLeave();
                    n.setEmployee(employeeRepository.getReferenceById(employeeId));
                    n.setLeaveType(leaveTypeRepository.getReferenceById(leaveTypeId));
                    n.setAssignedDate(LocalDate.now());
                    return n;
                });
        al.setAvailableDays(al.getAvailableDays() + days);
        al.setTotalLeaveDays(al.getTotalLeaveDays() + days);
        return ResponseEntity.ok(availableLeaveRepository.save(al));
    }

    // ─── Leave Allocation Requests ────────────────────────────────────────────

    @GetMapping("/allocation-requests")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List leave allocation requests (company-scoped)")
    public ResponseEntity<List<LeaveAllocationRequest>> listAllocationRequests() {
        var spec = ScopeFilter.<LeaveAllocationRequest>byEmployee();
        return ResponseEntity.ok(spec != null ? allocationRequestRepository.findAll(spec) : allocationRequestRepository.findAll());
    }

    @PostMapping("/allocation-requests")
    @PreAuthorize("hasAuthority('leave:create')")
    @Transactional
    @Operation(summary = "Submit a leave allocation request")
    public ResponseEntity<LeaveAllocationRequest> createAllocationRequest(@RequestBody LeaveAllocationRequest req) {
        if (req.getEmployee() != null && req.getEmployee().getId() != null) {
            req.setEmployee(employeeRepository.getReferenceById(req.getEmployee().getId()));
        }
        if (req.getLeaveType() != null && req.getLeaveType().getId() != null) {
            req.setLeaveType(leaveTypeRepository.getReferenceById(req.getLeaveType().getId()));
        }
        req.setRequestedDate(LocalDate.now());
        req.setStatus(LeaveAllocationRequest.AllocationStatus.REQUESTED);
        return ResponseEntity.ok(allocationRequestRepository.save(req));
    }

    @PostMapping("/allocation-requests/{id}/approve")
    @PreAuthorize("hasAuthority('leave:approve')")
    @Transactional
    @Operation(summary = "Approve a leave allocation request")
    public ResponseEntity<LeaveAllocationRequest> approveAllocationRequest(@PathVariable Long id) {
        LeaveAllocationRequest req = allocationRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveAllocationRequest", id));
        req.setStatus(LeaveAllocationRequest.AllocationStatus.APPROVED);
        // Credit the balance
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
        return ResponseEntity.ok(allocationRequestRepository.save(req));
    }

    @PostMapping("/allocation-requests/{id}/reject")
    @PreAuthorize("hasAuthority('leave:approve')")
    @Transactional
    @Operation(summary = "Reject a leave allocation request")
    public ResponseEntity<LeaveAllocationRequest> rejectAllocationRequest(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        LeaveAllocationRequest req = allocationRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveAllocationRequest", id));
        req.setStatus(LeaveAllocationRequest.AllocationStatus.REJECTED);
        req.setRejectReason(reason);
        return ResponseEntity.ok(allocationRequestRepository.save(req));
    }

    // ─── Leave Restrictions ───────────────────────────────────────────────────

    @GetMapping("/restrictions")
    @PreAuthorize("hasAuthority('leave:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List leave restrictions (company-scoped)")
    public ResponseEntity<List<RestrictLeave>> listRestrictions() {
        var spec = ScopeFilter.<RestrictLeave>byCompany();
        return ResponseEntity.ok(spec != null ? restrictLeaveRepository.findAll(spec) : restrictLeaveRepository.findAll());
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
    public ResponseEntity<List<com.example.demo.leave.entity.CompensatoryLeaveRequest>> listCompensatoryRequests(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) String status) {
        if (employeeId != null) return ResponseEntity.ok(compensatoryLeaveRequestRepository.findByEmployeeId(employeeId));
        if (status != null) return ResponseEntity.ok(compensatoryLeaveRequestRepository.findByStatus(status));
        return ResponseEntity.ok(compensatoryLeaveRequestRepository.findAll());
    }

    @PostMapping("/compensatory-requests")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<com.example.demo.leave.entity.CompensatoryLeaveRequest> createCompensatoryRequest(
            @RequestBody com.example.demo.leave.entity.CompensatoryLeaveRequest request) {
        return ResponseEntity.ok(compensatoryLeaveRequestRepository.save(request));
    }

    @PutMapping("/compensatory-requests/{id}/approve")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')")
    @Transactional
    public ResponseEntity<com.example.demo.leave.entity.CompensatoryLeaveRequest> approveCompensatoryRequest(@PathVariable Long id) {
        com.example.demo.leave.entity.CompensatoryLeaveRequest req = compensatoryLeaveRequestRepository.findById(id)
                .orElseThrow(() -> new com.example.demo.common.exception.ResourceNotFoundException("CompensatoryLeaveRequest", id));
        req.setStatus("approved");
        return ResponseEntity.ok(compensatoryLeaveRequestRepository.save(req));
    }

    @PutMapping("/compensatory-requests/{id}/reject")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','HR_MANAGER')")
    @Transactional
    public ResponseEntity<com.example.demo.leave.entity.CompensatoryLeaveRequest> rejectCompensatoryRequest(
            @PathVariable Long id, @RequestParam(required = false) String reason) {
        com.example.demo.leave.entity.CompensatoryLeaveRequest req = compensatoryLeaveRequestRepository.findById(id)
                .orElseThrow(() -> new com.example.demo.common.exception.ResourceNotFoundException("CompensatoryLeaveRequest", id));
        req.setStatus("rejected");
        if (reason != null) req.setRejectReason(reason);
        return ResponseEntity.ok(compensatoryLeaveRequestRepository.save(req));
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
}
