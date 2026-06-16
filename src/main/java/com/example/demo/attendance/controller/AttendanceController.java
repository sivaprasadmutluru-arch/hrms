package com.example.demo.attendance.controller;

import com.example.demo.attendance.dto.AttendanceCalendarDayDto;
import com.example.demo.attendance.dto.AttendanceRegisterDayDto;
import com.example.demo.attendance.dto.AttendanceRegisterResponse;
import com.example.demo.attendance.dto.AttendanceRequest;
import com.example.demo.attendance.dto.AttendanceResponse;
import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.entity.AttendanceOverTime;
import com.example.demo.attendance.entity.AttendanceRequestComment;
import com.example.demo.attendance.entity.AttendanceRequestFile;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.attendance.repository.AttendanceRequestCommentRepository;
import com.example.demo.attendance.repository.AttendanceRequestFileRepository;
import com.example.demo.attendance.service.AttendanceService;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.auth.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@Tag(name = "Attendance Management")
public class AttendanceController {

    private static final java.time.ZoneId DUBAI_ZONE = java.time.ZoneId.of("Asia/Dubai");

    private final AttendanceService attendanceService;

    private final AttendanceRepository attendanceRepository;
    private final AttendanceRequestCommentRepository requestCommentRepository;
    private final AttendanceRequestFileRepository requestFileRepository;
    private final EmployeeRepository employeeRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('attendance:view')")
    @Operation(summary = "List all attendance records (company-scoped) with optional filters")
    public ResponseEntity<Page<AttendanceResponse>> list(
            @PageableDefault(size = 20) Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long departmentId) {
        return ResponseEntity.ok(attendanceService.getAll(pageable, status, from, to, departmentId));
    }

    @GetMapping("/calendar")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Operation(summary = "Get per-day attendance calendar for a given month")
    public ResponseEntity<List<AttendanceCalendarDayDto>> getCalendar(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) Long employeeId) {
        return ResponseEntity.ok(attendanceService.getCalendar(year, month, employeeId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('attendance:view')")
    public ResponseEntity<AttendanceResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(attendanceService.getById(id));
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('attendance:view')")
    public ResponseEntity<List<AttendanceResponse>> getByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(attendanceService.getByEmployee(employeeId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('attendance:create')")
    public ResponseEntity<AttendanceResponse> create(@Valid @RequestBody AttendanceRequest request) {
        return ResponseEntity.ok(attendanceService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('attendance:edit')")
    public ResponseEntity<AttendanceResponse> update(@PathVariable Long id, @Valid @RequestBody AttendanceRequest request) {
        return ResponseEntity.ok(attendanceService.update(id, request));
    }

    @PostMapping("/{id}/request-validation")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Employee requests validation/regularization of their attendance record")
    @Transactional
    public ResponseEntity<AttendanceResponse> requestValidation(@PathVariable Long id) {
        Attendance att = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", id));
        // Ownership check: employee can only request validation for their own record
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean hasApproveAuthority = auth.getAuthorities().stream()
                .anyMatch(a -> "attendance:approve".equals(a.getAuthority()));
        if (!hasApproveAuthority && auth.getPrincipal() instanceof UserPrincipal principal) {
            boolean isOwner = employeeRepository.findByUserId(principal.getId())
                    .map(emp -> emp.getId().equals(att.getEmployee() != null ? att.getEmployee().getId() : null))
                    .orElse(false);
            if (!isOwner) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        att.setIsValidateRequest(true);
        att.setIsValidateRequestApproved(false);
        return ResponseEntity.ok(AttendanceResponse.from(attendanceRepository.save(att)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Operation(summary = "Approve attendance validation request")
    public ResponseEntity<AttendanceResponse> approve(@PathVariable Long id) {
        return ResponseEntity.ok(attendanceService.approve(id));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('attendance:approve')")
    public ResponseEntity<AttendanceResponse> reject(@PathVariable Long id) {
        return ResponseEntity.ok(attendanceService.reject(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('attendance:delete')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        attendanceService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Attendance record deactivated"));
    }

    // ─── Worked Hours Computation ─────────────────────────────────────────────

    @PostMapping("/{id}/compute-hours")
    @PreAuthorize("hasAuthority('attendance:edit')")
    @Operation(summary = "Compute and store worked hours from check-in/check-out times")
    public ResponseEntity<AttendanceResponse> computeHours(@PathVariable Long id) {
        return ResponseEntity.ok(attendanceService.computeWorkedHours(id));
    }

    @PostMapping("/{id}/detect-late-early")
    @PreAuthorize("hasAuthority('attendance:edit')")
    @Operation(summary = "Detect late-come / early-out based on shift schedule and record entries")
    public ResponseEntity<Map<String, String>> detectLateEarly(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int graceMinutes) {
        attendanceService.detectLateComeEarlyOut(id, graceMinutes);
        return ResponseEntity.ok(Map.of("message", "Late/early detection completed"));
    }

    // ─── Overtime ─────────────────────────────────────────────────────────────

    @GetMapping("/overtime")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Operation(summary = "List overtime records for a company")
    public ResponseEntity<List<AttendanceOverTime>> listOvertime(@RequestParam Long companyId) {
        return ResponseEntity.ok(attendanceService.listOvertime(companyId));
    }

    @PostMapping("/overtime/compute")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Compute and aggregate monthly overtime for an employee")
    public ResponseEntity<AttendanceOverTime> computeOvertime(
            @RequestParam Long employeeId,
            @RequestParam Long companyId,
            @RequestParam int month,
            @RequestParam int year) {
        return ResponseEntity.ok(attendanceService.computeMonthlyOvertime(employeeId, companyId, month, year));
    }

    @PostMapping("/overtime/{id}/approve")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Operation(summary = "Approve an overtime record")
    public ResponseEntity<AttendanceOverTime> approveOvertime(@PathVariable Long id) {
        return ResponseEntity.ok(attendanceService.approveOvertime(id));
    }

    @PostMapping("/overtime/{id}/reject")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Operation(summary = "Reject an overtime record")
    public ResponseEntity<AttendanceOverTime> rejectOvertime(@PathVariable Long id) {
        return ResponseEntity.ok(attendanceService.rejectOvertime(id));
    }

    // ─── Attendance Request Comments ──────────────────────────────────────────

    @GetMapping("/{attendanceId}/request-comments")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List request comments for an attendance record")
    public ResponseEntity<List<AttendanceRequestComment>> listRequestComments(@PathVariable Long attendanceId) {
        return ResponseEntity.ok(requestCommentRepository.findByAttendanceId(attendanceId));
    }

    @PostMapping("/{attendanceId}/request-comments")
    @PreAuthorize("hasAuthority('attendance:create')")
    @Transactional
    @Operation(summary = "Add a request comment to an attendance record")
    public ResponseEntity<AttendanceRequestComment> addRequestComment(
            @PathVariable Long attendanceId,
            @RequestBody AttendanceRequestComment comment) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", attendanceId));
        comment.setAttendance(attendance);
        if (comment.getEmployee() != null && comment.getEmployee().getId() != null) {
            comment.setEmployee(employeeRepository.getReferenceById(comment.getEmployee().getId()));
        }
        return ResponseEntity.ok(requestCommentRepository.save(comment));
    }

    @DeleteMapping("/request-comments/{id}")
    @PreAuthorize("hasAuthority('attendance:delete')")
    @Operation(summary = "Delete a request comment")
    public ResponseEntity<Map<String, String>> deleteRequestComment(@PathVariable Long id) {
        requestCommentRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Comment deleted"));
    }

    // ─── Attendance Request Files ─────────────────────────────────────────────

    @PostMapping("/request-files")
    @PreAuthorize("hasAuthority('attendance:create')")
    @Transactional
    @Operation(summary = "Create an attendance request file reference")
    public ResponseEntity<AttendanceRequestFile> createRequestFile(@RequestBody AttendanceRequestFile file) {
        return ResponseEntity.ok(requestFileRepository.save(file));
    }

    @DeleteMapping("/request-files/{id}")
    @PreAuthorize("hasAuthority('attendance:delete')")
    @Operation(summary = "Delete an attendance request file")
    public ResponseEntity<Map<String, String>> deleteRequestFile(@PathVariable Long id) {
        requestFileRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "File deleted"));
    }

    // ─── Clock In / Out ───────────────────────────────────────────────────────

    @PostMapping("/clock-in")
    @PreAuthorize("hasAuthority('attendance:create')")
    @Operation(summary = "Clock in an employee")
    public ResponseEntity<AttendanceResponse> clockIn(
            @RequestParam Long employeeId,
            @RequestParam Long companyId) {
        return ResponseEntity.ok(attendanceService.clockIn(employeeId, companyId));
    }

    @PostMapping("/clock-out")
    @PreAuthorize("hasAuthority('attendance:edit')")
    @Operation(summary = "Clock out an employee")
    public ResponseEntity<AttendanceResponse> clockOut(@RequestParam Long attendanceId) {
        return ResponseEntity.ok(attendanceService.clockOut(attendanceId));
    }

    // ─── Not Clocked In / Out ─────────────────────────────────────────────────

    @GetMapping("/not-in")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Operation(summary = "Get employees who have not clocked in on a given date")
    public ResponseEntity<List<Map<String, Object>>> getNotClockedIn(
            @RequestParam Long companyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(attendanceService.getNotClockedIn(companyId, date != null ? date : LocalDate.now(DUBAI_ZONE)));
    }

    @GetMapping("/not-out")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Operation(summary = "Get employees who have not clocked out on a given date")
    public ResponseEntity<List<Map<String, Object>>> getNotClockedOut(
            @RequestParam Long companyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(attendanceService.getNotClockedOut(companyId, date != null ? date : LocalDate.now(DUBAI_ZONE)));
    }

    // ─── Today's Attendance ───────────────────────────────────────────────────

    @GetMapping("/today")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Operation(summary = "Get today's attendance records for a company")
    public ResponseEntity<List<AttendanceResponse>> getTodayAttendance(@RequestParam Long companyId) {
        return ResponseEntity.ok(attendanceService.getTodayAttendance(companyId));
    }

    // ─── Excel Export / Import ────────────────────────────────────────────────

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Operation(summary = "Export attendance records to Excel")
    public void exportToExcel(@RequestParam Long companyId, HttpServletResponse response) throws IOException {
        attendanceService.exportToExcel(companyId, response);
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('attendance:create')")
    @Operation(summary = "Import attendance records from Excel")
    public ResponseEntity<Map<String, Object>> importFromExcel(
            @RequestParam MultipartFile file,
            @RequestParam Long companyId) throws IOException {
        int count = attendanceService.importFromExcel(file, companyId);
        return ResponseEntity.ok(Map.of("imported", count));
    }

    // ─── Bulk Approve Overtime ────────────────────────────────────────────────

    @PostMapping("/overtime/bulk-approve")
    @PreAuthorize("hasAuthority('attendance:approve')")
    @Operation(summary = "Bulk approve overtime records")
    public ResponseEntity<Map<String, Object>> bulkApproveOvertime(@RequestBody List<Long> ids) {
        int count = attendanceService.bulkApproveOvertime(ids);
        return ResponseEntity.ok(Map.of("approved", count));
    }

    // ─── Attendance Register ──────────────────────────────────────────────────

    @GetMapping("/register")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Get monthly attendance register matrix for all employees")
    public ResponseEntity<AttendanceRegisterResponse> getRegister(
            @RequestParam Long companyId,
            @RequestParam(required = false) Long departmentId,
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(attendanceService.getRegister(companyId, departmentId, year, month));
    }

    @PatchMapping("/register/{employeeId}/{date}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Inline-edit a single attendance register cell")
    public ResponseEntity<AttendanceRegisterDayDto> updateRegisterCell(
            @PathVariable Long employeeId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody Map<String, String> body,
            @RequestParam Long companyId) {
        String status = body.getOrDefault("status", "present");
        return ResponseEntity.ok(attendanceService.updateRegisterCell(employeeId, date, status, companyId));
    }

    @GetMapping("/register/export")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Export attendance register matrix to Excel")
    public void exportRegister(
            @RequestParam Long companyId,
            @RequestParam(required = false) Long departmentId,
            @RequestParam int year,
            @RequestParam int month,
            HttpServletResponse response) throws IOException {
        attendanceService.exportRegisterToExcel(companyId, departmentId, year, month, response);
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Operation(summary = "Get attendance dashboard stats for a company")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @RequestParam Long companyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long departmentId) {
        return ResponseEntity.ok(attendanceService.getDashboard(companyId, date, departmentId));
    }

    // ─── Validation Pending ───────────────────────────────────────────────────

    @GetMapping("/validation-pending")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List attendance records where employee has requested validation (pending approval)")
    public ResponseEntity<List<AttendanceResponse>> getValidationPending(@RequestParam Long companyId) {
        List<AttendanceResponse> pending = attendanceRepository.findByCompanyId(companyId).stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsValidateRequest())
                        && !Boolean.TRUE.equals(a.getIsValidateRequestApproved()))
                .map(AttendanceResponse::from)
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(pending);
    }
}
