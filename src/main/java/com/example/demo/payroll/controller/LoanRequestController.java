package com.example.demo.payroll.controller;

import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.payroll.dto.LoanRequestApprovalRequest;
import com.example.demo.payroll.dto.LoanRequestDto;
import com.example.demo.payroll.dto.LoanRequestSubmitRequest;
import com.example.demo.payroll.service.LoanRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payroll/loan-requests")
@RequiredArgsConstructor
@Tag(name = "Loan Requests")
public class LoanRequestController {

    private final LoanRequestService loanRequestService;

    // ─── Employee ─────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Employee submits a loan/advance/fine request")
    public ResponseEntity<LoanRequestDto> submit(@RequestBody LoanRequestSubmitRequest req) {
        return ResponseEntity.ok(loanRequestService.submitRequest(req, getCurrentUserId()));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Employee views their own loan requests")
    public ResponseEntity<List<LoanRequestDto>> myRequests() {
        return ResponseEntity.ok(loanRequestService.getMyRequests(getCurrentUserId()));
    }

    // ─── Admin / HR / Accountant ────────────────────────────────────────────

    @GetMapping("/pending-approval")
    @PreAuthorize("hasAuthority('payroll:approve')")
    @Operation(summary = "List loan requests pending approval")
    public ResponseEntity<List<LoanRequestDto>> pendingApproval(@RequestParam Long companyId) {
        return ResponseEntity.ok(loanRequestService.getPendingApproval(companyId));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('payroll:approve')")
    @Operation(summary = "Approve a loan request")
    public ResponseEntity<LoanRequestDto> approve(
            @PathVariable Long id,
            @RequestBody(required = false) LoanRequestApprovalRequest body) {
        String remarks = body != null ? body.getRemarks() : null;
        return ResponseEntity.ok(loanRequestService.approve(id, remarks, getCurrentUserId()));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('payroll:approve')")
    @Operation(summary = "Reject a loan request")
    public ResponseEntity<LoanRequestDto> reject(
            @PathVariable Long id,
            @RequestBody(required = false) LoanRequestApprovalRequest body) {
        String remarks = body != null ? body.getRemarks() : null;
        return ResponseEntity.ok(loanRequestService.reject(id, remarks, getCurrentUserId()));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('payroll:view')")
    @Operation(summary = "List all loan requests for a company")
    public ResponseEntity<List<LoanRequestDto>> listAll(@RequestParam Long companyId) {
        return ResponseEntity.ok(loanRequestService.getAllForCompany(companyId));
    }

    @GetMapping("/pending-counts")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get pending loan request count badge for the current user")
    public ResponseEntity<Map<String, Long>> pendingCounts(@RequestParam(required = false) Long companyId) {
        long pendingApproval = companyId != null ? loanRequestService.countPendingApproval(companyId) : 0;
        return ResponseEntity.ok(Map.of("pendingApproval", pendingApproval));
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getId();
        }
        throw new IllegalStateException("No authenticated user");
    }
}
