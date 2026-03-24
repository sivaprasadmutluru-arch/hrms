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
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

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
}
