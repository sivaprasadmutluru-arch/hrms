package com.example.demo.attendance.controller;

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
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@Tag(name = "Attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceRequestCommentRepository requestCommentRepository;
    private final AttendanceRequestFileRepository requestFileRepository;
    private final EmployeeRepository employeeRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('attendance:view')")
    @Operation(summary = "List all attendance records (company-scoped)")
    public ResponseEntity<Page<AttendanceResponse>> list(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(attendanceService.getAll(pageable));
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
}
