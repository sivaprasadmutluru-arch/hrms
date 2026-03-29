package com.example.demo.ess.controller;

import com.example.demo.attendance.dto.AttendanceRequest;
import com.example.demo.attendance.dto.AttendanceResponse;
import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.dto.EmployeeResponse;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.entity.LeaveType;
import com.example.demo.leave.repository.LeaveRequestRepository;
import com.example.demo.leave.service.LeaveService;
import com.example.demo.payroll.entity.Payslip;
import com.example.demo.payroll.repository.PayslipRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Employee Self-Service (ESS) endpoints.
 *
 * These endpoints are driven exclusively by the logged-in user's identity —
 * no company scope header or ScopeFilter is involved. Every response is
 * guaranteed to contain only the current employee's own data.
 *
 * Access: any authenticated user who has an employee record.
 */
@RestController
@RequestMapping("/api/ess")
@RequiredArgsConstructor
@Tag(name = "ESS (Employee Self-Service)")
@Transactional
public class ESSController {

    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AttendanceRepository attendanceRepository;
    private final PayslipRepository payslipRepository;
    private final LeaveService leaveService;

    // ── Profile ──────────────────────────────────────────────────────────────

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get own employee profile")
    public ResponseEntity<EmployeeResponse> me(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        return ResponseEntity.ok(EmployeeResponse.from(emp));
    }

    // ── Leave ─────────────────────────────────────────────────────────────────

    @GetMapping("/my-leave")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get own leave requests")
    public ResponseEntity<List<LeaveRequest>> myLeave(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        return ResponseEntity.ok(leaveRequestRepository.findByEmployeeId(emp.getId()));
    }

    @PostMapping("/apply-leave")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Apply for leave (self)")
    public ResponseEntity<LeaveRequest> applyLeave(
            Authentication auth,
            @RequestParam Long leaveTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String description) {
        Employee emp = resolveEmployee(auth);
        LeaveRequest req = leaveService.applyLeave(
                emp.getId(), leaveTypeId, startDate, endDate, description, emp.getCompany().getId());
        return ResponseEntity.ok(req);
    }

    // ── Attendance ────────────────────────────────────────────────────────────

    @GetMapping("/my-attendance")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get own attendance records")
    public ResponseEntity<List<AttendanceResponse>> myAttendance(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Employee emp = resolveEmployee(auth);
        List<Attendance> records = (from != null && to != null)
                ? attendanceRepository.findByEmployeeIdAndAttendanceDateBetween(emp.getId(), from, to)
                : attendanceRepository.findByEmployeeId(emp.getId());
        return ResponseEntity.ok(records.stream().map(AttendanceResponse::from).toList());
    }

    @PostMapping("/check-in")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Self check-in for today")
    public ResponseEntity<AttendanceResponse> checkIn(
            Authentication auth,
            @RequestBody(required = false) AttendanceRequest request) {
        final AttendanceRequest req = (request != null) ? request : new AttendanceRequest();
        Employee emp = resolveEmployee(auth);
        // Enforce that the employee can only check in for themselves
        req.setEmployeeId(emp.getId());
        req.setCompanyId(emp.getCompany().getId());
        LocalDate today = LocalDate.now();
        Attendance saved = attendanceRepository.findByEmployeeIdAndAttendanceDate(
                        emp.getId(), req.getAttendanceDate() != null ? req.getAttendanceDate() : today)
                .map(existing -> {
                    // Update existing record with check-out time
                    existing.setCheckOut(req.getCheckOut() != null ? req.getCheckOut() : java.time.LocalTime.now());
                    existing.setCheckOutDate(req.getCheckOutDate() != null ? req.getCheckOutDate() : today);
                    if (existing.getCheckIn() != null && existing.getCheckOut() != null) {
                        long minutes = java.time.temporal.ChronoUnit.MINUTES.between(existing.getCheckIn(), existing.getCheckOut());
                        if (minutes < 0) minutes += 24 * 60;
                        existing.setWorkedHour(req.getWorkedHour() != null ? req.getWorkedHour() : minutes / 60.0);
                    } else if (req.getWorkedHour() != null) {
                        existing.setWorkedHour(req.getWorkedHour());
                    }
                    return attendanceRepository.save(existing);
                })
                .orElseGet(() -> {
                    Attendance att = new Attendance();
                    att.setEmployee(emp);
                    att.setCompany(emp.getCompany());
                    att.setAttendanceDate(req.getAttendanceDate() != null ? req.getAttendanceDate() : today);
                    att.setCheckIn(req.getCheckIn() != null ? req.getCheckIn() : java.time.LocalTime.now());
                    att.setCheckInDate(req.getCheckInDate() != null ? req.getCheckInDate() : today);
                    return attendanceRepository.save(att);
                });
        return ResponseEntity.ok(AttendanceResponse.from(saved));
    }

    // ── Payslips ──────────────────────────────────────────────────────────────

    @GetMapping("/my-payslips")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get own payslips")
    public ResponseEntity<List<Payslip>> myPayslips(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        return ResponseEntity.ok(payslipRepository.findByEmployeeId(emp.getId()));
    }

    // ── Leave types (for apply-leave form) ───────────────────────────────────

    @GetMapping("/leave-types")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get available leave types for own company")
    public ResponseEntity<List<LeaveType>> leaveTypes(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        return ResponseEntity.ok(leaveService.getLeaveTypes());
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private Employee resolveEmployee(Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return employeeRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No employee record linked to your user account. Contact your HR admin."));
    }
}
