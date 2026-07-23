package com.example.demo.attendance.controller;

import com.example.demo.attendance.dto.RegularisationApprovalRequest;
import com.example.demo.attendance.dto.RegularisationRequestDto;
import com.example.demo.attendance.dto.RegularisationSubmitRequest;
import com.example.demo.attendance.dto.UnresolvedIrregularAttendanceDto;
import com.example.demo.attendance.service.AttendanceRegularisationService;
import com.example.demo.auth.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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
    @Operation(summary = "Employee submits a regularisation request for an IRREGULAR attendance; " +
            "HR/Admin (with attendance:approve) may submit on behalf of another employee via employeeId")
    public ResponseEntity<RegularisationRequestDto> submit(@RequestBody RegularisationSubmitRequest req) {
        if (req.getEmployeeId() != null && !hasApprovalAuthority()) {
            throw new AccessDeniedException("Only an HR/Admin with attendance approval rights can submit a request on behalf of another employee");
        }
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(regularisationService.submitRequest(req, userId));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Employee views their own regularisation requests")
    public ResponseEntity<List<RegularisationRequestDto>> myRequests() {
        return ResponseEntity.ok(regularisationService.getMyRequests(getCurrentUserId()));
    }

    @GetMapping("/unresolved")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List the current employee's unresolved IRREGULAR attendance (last 30 days) with no submitted request")
    public ResponseEntity<List<UnresolvedIrregularAttendanceDto>> unresolved() {
        return ResponseEntity.ok(regularisationService.getUnresolvedForEmployee(getCurrentUserId()));
    }

    // ─── Admin / HR Manager ────────────────────────────────────────────────────

    @GetMapping("/pending-approval")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Operation(summary = "List regularisation requests pending approval")
    public ResponseEntity<List<RegularisationRequestDto>> pendingApproval(@RequestParam Long companyId) {
        return ResponseEntity.ok(regularisationService.getPendingApproval(companyId));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Operation(summary = "Admin/HR manager approves a regularisation request")
    public ResponseEntity<RegularisationRequestDto> approve(
            @PathVariable Long id,
            @RequestBody(required = false) RegularisationApprovalRequest body) {
        String remarks = body != null ? body.getRemarks() : null;
        return ResponseEntity.ok(regularisationService.approve(id, remarks, getCurrentUserId()));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Operation(summary = "Admin/HR manager rejects a regularisation request")
    public ResponseEntity<RegularisationRequestDto> reject(
            @PathVariable Long id,
            @RequestBody(required = false) RegularisationApprovalRequest body) {
        String remarks = body != null ? body.getRemarks() : null;
        return ResponseEntity.ok(regularisationService.reject(id, remarks, getCurrentUserId()));
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
    @Operation(summary = "Get pending approval count badge for the current user")
    public ResponseEntity<Map<String, Long>> pendingCounts(@RequestParam(required = false) Long companyId) {
        long pendingApproval = companyId != null ? regularisationService.countPendingApproval(companyId) : 0;
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

    private boolean hasApprovalAuthority() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("attendance:approve"));
    }
}
