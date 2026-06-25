package com.example.demo.attendance.controller;

import com.example.demo.attendance.dto.RegularisationApprovalRequest;
import com.example.demo.attendance.dto.RegularisationRequestDto;
import com.example.demo.attendance.dto.RegularisationSubmitRequest;
import com.example.demo.attendance.service.AttendanceRegularisationService;
import com.example.demo.auth.security.UserPrincipal;
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
@RequestMapping("/api/attendance/regularisation")
@RequiredArgsConstructor
@Tag(name = "Attendance Regularisation")
public class AttendanceRegularisationController {

    private final AttendanceRegularisationService regularisationService;

    // ─── Employee ─────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Employee submits a regularisation request for an IRREGULAR attendance")
    public ResponseEntity<RegularisationRequestDto> submit(@RequestBody RegularisationSubmitRequest req) {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(regularisationService.submitRequest(req, userId));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Employee views their own regularisation requests")
    public ResponseEntity<List<RegularisationRequestDto>> myRequests() {
        return ResponseEntity.ok(regularisationService.getMyRequests(getCurrentUserId()));
    }

    // ─── Manager ─────────────────────────────────────────────────────────────

    @GetMapping("/pending-manager")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List regularisation requests pending the current manager's approval")
    public ResponseEntity<List<RegularisationRequestDto>> pendingForManager() {
        return ResponseEntity.ok(regularisationService.getPendingForManager(getCurrentUserId()));
    }

    @PostMapping("/{id}/approve-manager")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Manager approves a regularisation request")
    public ResponseEntity<RegularisationRequestDto> approveByManager(
            @PathVariable Long id,
            @RequestBody(required = false) RegularisationApprovalRequest body) {
        String remarks = body != null ? body.getRemarks() : null;
        return ResponseEntity.ok(regularisationService.approveByManager(id, remarks, getCurrentUserId()));
    }

    @PostMapping("/{id}/reject-manager")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Manager rejects a regularisation request")
    public ResponseEntity<RegularisationRequestDto> rejectByManager(
            @PathVariable Long id,
            @RequestBody(required = false) RegularisationApprovalRequest body) {
        String remarks = body != null ? body.getRemarks() : null;
        return ResponseEntity.ok(regularisationService.rejectByManager(id, remarks, getCurrentUserId()));
    }

    // ─── HR ──────────────────────────────────────────────────────────────────

    @GetMapping("/pending-hr")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Operation(summary = "List regularisation requests pending HR verification")
    public ResponseEntity<List<RegularisationRequestDto>> pendingForHR(@RequestParam Long companyId) {
        return ResponseEntity.ok(regularisationService.getPendingForHR(companyId));
    }

    @PostMapping("/{id}/approve-hr")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Operation(summary = "HR approves a regularisation request (final approval)")
    public ResponseEntity<RegularisationRequestDto> approveByHR(
            @PathVariable Long id,
            @RequestBody(required = false) RegularisationApprovalRequest body) {
        String remarks = body != null ? body.getRemarks() : null;
        return ResponseEntity.ok(regularisationService.approveByHR(id, remarks, getCurrentUserId()));
    }

    @PostMapping("/{id}/reject-hr")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Operation(summary = "HR rejects a regularisation request")
    public ResponseEntity<RegularisationRequestDto> rejectByHR(
            @PathVariable Long id,
            @RequestBody(required = false) RegularisationApprovalRequest body) {
        String remarks = body != null ? body.getRemarks() : null;
        return ResponseEntity.ok(regularisationService.rejectByHR(id, remarks, getCurrentUserId()));
    }

    // ─── HR / Admin: Full List ────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('attendance:view')")
    @Operation(summary = "List all regularisation requests for a company")
    public ResponseEntity<List<RegularisationRequestDto>> listAll(@RequestParam Long companyId) {
        return ResponseEntity.ok(regularisationService.getAllForCompany(companyId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Operation(summary = "Get regularisation request detail")
    public ResponseEntity<RegularisationRequestDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(regularisationService.getById(id));
    }

    // ─── Utility ─────────────────────────────────────────────────────────────

    @GetMapping("/pending-counts")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get pending count badges for the current user (manager + HR views)")
    public ResponseEntity<Map<String, Long>> pendingCounts(@RequestParam(required = false) Long companyId) {
        Long userId = getCurrentUserId();
        long pendingManager = regularisationService.countPendingForManager(userId);
        long pendingHR = companyId != null ? regularisationService.countPendingForHR(companyId) : 0;
        return ResponseEntity.ok(Map.of("pendingManager", pendingManager, "pendingHR", pendingHR));
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
