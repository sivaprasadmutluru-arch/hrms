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
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

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
}
