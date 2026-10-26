package com.example.demo.attendance.controller;

import com.example.demo.base.entity.Company;
import com.example.demo.attendance.dto.ShiftAllocationDTO;
import com.example.demo.base.entity.ShiftAllocationRequest;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.ShiftAllocationRequestRepository;
import com.example.demo.base.repository.ShiftScheduleRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.common.context.AccessScopeContext;
import org.springframework.security.access.AccessDeniedException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.repository.EmployeeWorkInformationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final EmployeeWorkInformationRepository workInfoRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "List shift allocation requests (scope-filtered)")
    public ResponseEntity<List<ShiftAllocationDTO>> list(@RequestParam(required = false) String status) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        ShiftAllocationRequest.AllocationStatus statusEnum = status != null
                ? ShiftAllocationRequest.AllocationStatus.valueOf(status.toUpperCase()) : null;

        // No scope context or super admin with no company selected — return all
        if (scope == null || (scope.hasUnrestrictedAccess() && scope.getCompanyId() == null)) {
            return ResponseEntity.ok(allocationRepository.findAll().stream()
                    .filter(a -> statusEnum == null || a.getStatus() == statusEnum)
                    .map(ShiftAllocationDTO::from).toList());
        }

        java.util.List<Long> companyIds;
        if (scope.hasUnrestrictedAccess()) {
            // Platform super admin with a company selected: expand to full org (HO + all branches)
            companyIds = resolveOrgCompanyIds(scope.getCompanyId());
        } else {
            companyIds = scope.getAccessibleCompanyIds();
        }

        return ResponseEntity.ok((statusEnum != null
                ? allocationRepository.findByCompanyIdInAndStatus(companyIds, statusEnum)
                : allocationRepository.findByCompanyIdIn(companyIds)).stream().map(ShiftAllocationDTO::from).toList());
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List shift allocations for a specific employee")
    public ResponseEntity<List<ShiftAllocationDTO>> listForEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(allocationRepository.findByEmployeeId(employeeId).stream().map(ShiftAllocationDTO::from).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get a shift allocation by ID")
    public ResponseEntity<ShiftAllocationDTO> get(@PathVariable Long id) {
        return ResponseEntity.ok(ShiftAllocationDTO.from(allocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftAllocationRequest", id))));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a shift allocation request (manager/admin-initiated)")
    public ResponseEntity<ShiftAllocationDTO> create(@RequestBody ShiftAllocationRequest request) {
        if (request.getEmployee() != null && request.getEmployee().getId() != null) {
            Employee emp =
                    employeeRepository.findById(request.getEmployee().getId())
                            .orElseThrow(() -> new ResourceNotFoundException("Employee", request.getEmployee().getId()));
            assertEmployeeInScope(emp);
            request.setEmployee(emp);
        }
        if (request.getAllocatedShift() != null && request.getAllocatedShift().getId() != null) {
            request.setAllocatedShift(shiftScheduleRepository.getReferenceById(request.getAllocatedShift().getId()));
        }
        if (request.getPreviousShift() != null && request.getPreviousShift().getId() != null) {
            request.setPreviousShift(shiftScheduleRepository.getReferenceById(request.getPreviousShift().getId()));
        }
        // Auto-populate allocatedBy from the currently authenticated user
        if (SecurityContextHolder.getContext().getAuthentication().getPrincipal() instanceof UserPrincipal principal) {
            employeeRepository.findByUserId(principal.getId()).ifPresent(request::setAllocatedBy);
        }
        if (request.getCompany() != null && request.getCompany().getId() != null) {
            request.setCompany(companyRepository.getReferenceById(request.getCompany().getId()));
        }
        request.setStatus(ShiftAllocationRequest.AllocationStatus.PENDING);
        return ResponseEntity.ok(ShiftAllocationDTO.from(allocationRepository.save(request)));
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

        // Resolve the allocatedBy employee once for all records
        Employee allocatedByEmployee = null;
        if (SecurityContextHolder.getContext().getAuthentication().getPrincipal() instanceof UserPrincipal principal) {
            allocatedByEmployee = employeeRepository.findByUserId(principal.getId()).orElse(null);
        }
        final Employee allocatedBy = allocatedByEmployee;

        int created = 0;
        for (Integer empId : empIds) {
            Employee emp =
                    employeeRepository.findById(empId.longValue())
                            .orElseThrow(() -> new ResourceNotFoundException("Employee", empId.longValue()));
            assertEmployeeInScope(emp);
            ShiftAllocationRequest req = new ShiftAllocationRequest();
            req.setEmployee(emp);
            req.setAllocatedShift(shiftScheduleRepository.getReferenceById(shiftId));
            req.setCompany(companyRepository.getReferenceById(companyId));
            req.setAllocatedBy(allocatedBy);
            req.setStatus(ShiftAllocationRequest.AllocationStatus.APPROVED);
            if (effectiveDateStr != null) {
                req.setEffectiveDate(java.time.LocalDate.parse(effectiveDateStr));
            }
            allocationRepository.save(req);
            applyAllocatedShift(req);
            created++;
        }
        return ResponseEntity.ok(Map.<String, Object>of("message", "Shift allocated", "count", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a shift allocation")
    public ResponseEntity<ShiftAllocationDTO> update(@PathVariable Long id,
                                                          @RequestBody ShiftAllocationRequest updated) {
        ShiftAllocationRequest req = allocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftAllocationRequest", id));
        assertEmployeeInScope(req.getEmployee());
        if (updated.getAllocatedShift() != null && updated.getAllocatedShift().getId() != null) {
            req.setAllocatedShift(shiftScheduleRepository.getReferenceById(updated.getAllocatedShift().getId()));
        }
        if (updated.getEffectiveDate() != null) req.setEffectiveDate(updated.getEffectiveDate());
        if (updated.getDescription() != null) req.setDescription(updated.getDescription());
        if (req.getStatus() == ShiftAllocationRequest.AllocationStatus.APPROVED
                && updated.getAllocatedShift() != null && updated.getAllocatedShift().getId() != null) {
            applyAllocatedShift(req);
        }
        return ResponseEntity.ok(ShiftAllocationDTO.from(allocationRepository.save(req)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Approve a shift allocation request and update employee's active shift")
    public ResponseEntity<ShiftAllocationDTO> approve(@PathVariable Long id) {
        ShiftAllocationRequest req = allocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftAllocationRequest", id));
        assertEmployeeInScope(req.getEmployee());
        if (req.getStatus() != ShiftAllocationRequest.AllocationStatus.PENDING
                && req.getStatus() != ShiftAllocationRequest.AllocationStatus.APPROVED) {
            throw new BadRequestException("Only pending or approved shift allocations can be approved");
        }
        req.setStatus(ShiftAllocationRequest.AllocationStatus.APPROVED);
        applyAllocatedShift(req);
        return ResponseEntity.ok(ShiftAllocationDTO.from(allocationRepository.save(req)));
    }

    // Check-in reads Employee.shift first, while work-information pages read their
    // own shift field. Keep both in sync in the surrounding allocation transaction.
    private void applyAllocatedShift(ShiftAllocationRequest request) {
        Employee employee = request.getEmployee();
        var shift = request.getAllocatedShift();
        if (employee == null || employee.getCompany() == null || shift == null || shift.getCompany() == null
                || request.getCompany() == null
                || !employee.getCompany().getId().equals(request.getCompany().getId())
                || !employee.getCompany().getId().equals(shift.getCompany().getId())) {
            throw new BadRequestException("Employee, shift and allocation must belong to the same company");
        }
        employee.setShift(shift);
        employeeRepository.save(employee);
        workInfoRepository.findByEmployeeId(employee.getId()).ifPresent(workInfo -> {
            workInfo.setShift(shift);
            workInfoRepository.save(workInfo);
        });
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Cancel a shift allocation request")
    public ResponseEntity<ShiftAllocationDTO> cancel(@PathVariable Long id) {
        ShiftAllocationRequest req = allocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShiftAllocationRequest", id));
        req.setStatus(ShiftAllocationRequest.AllocationStatus.CANCELLED);
        return ResponseEntity.ok(ShiftAllocationDTO.from(allocationRepository.save(req)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Delete a shift allocation request")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        allocationRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Shift allocation deleted"));
    }

    /**
     * Throws AccessDeniedException if the employee's company is outside the current user's scope.
     * Platform Super Admin is always allowed.
     */
    private void assertEmployeeInScope(Employee employee) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();
        if (scope == null || scope.hasUnrestrictedAccess()) return; // platform admin — unrestricted
        List<Long> accessible = scope.getAccessibleCompanyIds();
        if (accessible.isEmpty()) return; // no restriction set
        Long empCompanyId = employee.getCompany() != null ? employee.getCompany().getId() : null;
        if (empCompanyId == null || !accessible.contains(empCompanyId)) {
            throw new AccessDeniedException("You do not have permission to allocate shifts to this employee");
        }
    }

    /**
     * For a given company ID, returns the full list of accessible company IDs in its org:
     * - If it's a head office → [headOfficeId] + all branch IDs
     * - If it's a branch → [parentHeadOfficeId] + all sibling branch IDs
     */
    private java.util.List<Long> resolveOrgCompanyIds(Long companyId) {
        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) return List.of(companyId);

        Long headOfficeId;
        if (company.isHeadOffice()) {
            headOfficeId = companyId;
        } else if (company.isBranch() && company.getParentCompanyId() != null) {
            headOfficeId = company.getParentCompanyId();
        } else {
            return List.of(companyId);
        }

        List<Long> ids = new java.util.ArrayList<>();
        ids.add(headOfficeId);
        ids.addAll(companyRepository.findBranchIdsByHeadOfficeId(headOfficeId));
        return ids;
    }
}
