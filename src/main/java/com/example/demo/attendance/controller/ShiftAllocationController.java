package com.example.demo.attendance.controller;

import com.example.demo.base.entity.ShiftAllocationRequest;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.ShiftAllocationRequestRepository;
import com.example.demo.base.repository.ShiftScheduleRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Manager/Admin-initiated shift allocations.
 *
 * Unlike ShiftRequestController (where an employee requests a shift change),
 * here a manager/HR allocates a shift to an employee top-down.
 */
@RestController
@RequestMapping("/api/shift-allocations")
@RequiredArgsConstructor
@Tag(name = "Shift Allocations")
public class ShiftAllocationController {

    private final ShiftAllocationRequestRepository allocationRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;
    private final CompanyRepository companyRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "List shift allocation requests for a company")
    public ResponseEntity<List<ShiftAllocationRequest>> list(@RequestParam Long companyId,
                                                              @RequestParam(required = false) String status) {
        if (status != null) {
            return ResponseEntity.ok(allocationRepository.findByCompanyIdAndStatus(
                    companyId, ShiftAllocationRequest.AllocationStatus.valueOf(status.toUpperCase())));
        }
        return ResponseEntity.ok(allocationRepository.findByCompanyId(companyId));
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List shift allocations for a specific employee")
    public ResponseEntity<List<ShiftAllocationRequest>> listForEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(allocationRepository.findByEmployeeId(employeeId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get a shift allocation by ID")
    public ResponseEntity<ShiftAllocationRequest> get(@PathVariable Long id) {
        return ResponseEntity.ok(allocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftAllocationRequest", id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a shift allocation request (manager/admin-initiated)")
    public ResponseEntity<ShiftAllocationRequest> create(@RequestBody ShiftAllocationRequest request) {
        if (request.getEmployee() != null && request.getEmployee().getId() != null) {
            request.setEmployee(employeeRepository.getReferenceById(request.getEmployee().getId()));
        }
        if (request.getAllocatedShift() != null && request.getAllocatedShift().getId() != null) {
            request.setAllocatedShift(shiftScheduleRepository.getReferenceById(request.getAllocatedShift().getId()));
        }
        if (request.getPreviousShift() != null && request.getPreviousShift().getId() != null) {
            request.setPreviousShift(shiftScheduleRepository.getReferenceById(request.getPreviousShift().getId()));
        }
        if (request.getAllocatedBy() != null && request.getAllocatedBy().getId() != null) {
            request.setAllocatedBy(employeeRepository.getReferenceById(request.getAllocatedBy().getId()));
        }
        if (request.getCompany() != null && request.getCompany().getId() != null) {
            request.setCompany(companyRepository.getReferenceById(request.getCompany().getId()));
        }
        request.setStatus(ShiftAllocationRequest.AllocationStatus.PENDING);
        return ResponseEntity.ok(allocationRepository.save(request));
    }

    @PostMapping("/bulk-allocate")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Bulk allocate a shift to multiple employees")
    public ResponseEntity<Map<String, Object>> bulkAllocate(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> empIds = (List<Integer>) body.get("employeeIds");
        Long shiftId = Long.valueOf(body.get("shiftId").toString());
        Long companyId = Long.valueOf(body.get("companyId").toString());
        String effectiveDateStr = body.containsKey("effectiveDate") ? body.get("effectiveDate").toString() : null;

        int created = 0;
        for (Integer empId : empIds) {
            ShiftAllocationRequest req = new ShiftAllocationRequest();
            req.setEmployee(employeeRepository.getReferenceById(empId.longValue()));
            req.setAllocatedShift(shiftScheduleRepository.getReferenceById(shiftId));
            req.setCompany(companyRepository.getReferenceById(companyId));
            req.setStatus(ShiftAllocationRequest.AllocationStatus.APPROVED);
            if (effectiveDateStr != null) {
                req.setEffectiveDate(java.time.LocalDate.parse(effectiveDateStr));
            }
            allocationRepository.save(req);
            created++;
        }
        return ResponseEntity.ok(Map.of("message", "Shift allocated", "count", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a shift allocation")
    public ResponseEntity<ShiftAllocationRequest> update(@PathVariable Long id,
                                                          @RequestBody ShiftAllocationRequest updated) {
        ShiftAllocationRequest req = allocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftAllocationRequest", id));
        if (updated.getAllocatedShift() != null && updated.getAllocatedShift().getId() != null) {
            req.setAllocatedShift(shiftScheduleRepository.getReferenceById(updated.getAllocatedShift().getId()));
        }
        if (updated.getEffectiveDate() != null) req.setEffectiveDate(updated.getEffectiveDate());
        if (updated.getDescription() != null) req.setDescription(updated.getDescription());
        return ResponseEntity.ok(allocationRepository.save(req));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Approve a shift allocation request")
    public ResponseEntity<ShiftAllocationRequest> approve(@PathVariable Long id) {
        ShiftAllocationRequest req = allocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftAllocationRequest", id));
        req.setStatus(ShiftAllocationRequest.AllocationStatus.APPROVED);
        return ResponseEntity.ok(allocationRepository.save(req));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Cancel a shift allocation request")
    public ResponseEntity<ShiftAllocationRequest> cancel(@PathVariable Long id) {
        ShiftAllocationRequest req = allocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftAllocationRequest", id));
        req.setStatus(ShiftAllocationRequest.AllocationStatus.CANCELLED);
        return ResponseEntity.ok(allocationRepository.save(req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Delete a shift allocation request")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        allocationRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Shift allocation deleted"));
    }
}
