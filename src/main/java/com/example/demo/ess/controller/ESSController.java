package com.example.demo.ess.controller;

import com.example.demo.attendance.dto.AttendanceRequest;
import com.example.demo.attendance.dto.AttendanceResponse;
import com.example.demo.attendance.entity.Attendance;
import com.example.demo.attendance.entity.AttendanceActivity;
import com.example.demo.attendance.repository.AttendanceActivityRepository;
import com.example.demo.attendance.repository.AttendanceRepository;
import com.example.demo.attendance.service.AttendanceService;
import com.example.demo.auth.security.UserPrincipal;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.dto.EmployeeResponse;
import com.example.demo.employee.dto.WorkInfoResponse;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.repository.EmployeeWorkInformationRepository;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.entity.LeaveType;
import com.example.demo.leave.repository.LeaveRequestRepository;
import com.example.demo.leave.service.LeaveService;
import com.example.demo.payroll.entity.Contract;
import com.example.demo.payroll.entity.Payslip;
import com.example.demo.payroll.repository.ContractRepository;
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
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

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

    private static final java.time.ZoneId DUBAI_ZONE = java.time.ZoneId.of("Asia/Dubai");

    private final EmployeeRepository employeeRepository;
    private final EmployeeWorkInformationRepository workInfoRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceActivityRepository attendanceActivityRepository;
    private final AttendanceService attendanceService;
    private final PayslipRepository payslipRepository;
    private final LeaveService leaveService;
    private final ContractRepository contractRepository;

    // ── Profile ──────────────────────────────────────────────────────────────

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get own employee profile")
    public ResponseEntity<EmployeeResponse> me(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        Contract contract = contractRepository.findByEmployeeId(emp.getId()).stream().findFirst().orElse(null);
        return ResponseEntity.ok(EmployeeResponse.from(emp, contract));
    }

    // ── Work Info ─────────────────────────────────────────────────────────────

    @GetMapping("/my-work-info")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    @Operation(summary = "Get own work information")
    public ResponseEntity<WorkInfoResponse> myWorkInfo(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        return workInfoRepository.findByEmployeeId(emp.getId())
                .map(wi -> {
                    WorkInfoResponse res = WorkInfoResponse.from(wi);
                    // Fall back to Employee-level fields when WorkInformation fields are not set
                    if (res.getShiftId() == null && emp.getShift() != null) {
                        res.setShiftId(emp.getShift().getId());
                        res.setShiftName(emp.getShift().getName());
                    }
                    if (res.getDepartmentId() == null && emp.getDepartment() != null) {
                        res.setDepartmentId(emp.getDepartment().getId());
                        res.setDepartmentName(emp.getDepartment().getName());
                    }
                    if (res.getJobPositionId() == null && emp.getJobPosition() != null) {
                        res.setJobPositionId(emp.getJobPosition().getId());
                        res.setJobPositionName(emp.getJobPosition().getName());
                    }
                    if (res.getJobRoleId() == null && emp.getJobRole() != null) {
                        res.setJobRoleId(emp.getJobRole().getId());
                        res.setJobRoleName(emp.getJobRole().getName());
                    }
                    if (res.getWorkTypeId() == null && emp.getWorkType() != null) {
                        res.setWorkTypeId(emp.getWorkType().getId());
                        res.setWorkTypeName(emp.getWorkType().getName());
                    }
                    // Merge salary from active Contract if not set in WorkInformation
                    if (res.getBasicSalary() == null && res.getHousingAllowance() == null) {
                        contractRepository.findByEmployeeIdAndContractStatus(emp.getId(), com.example.demo.payroll.entity.Contract.ContractStatus.ACTIVE)
                                .ifPresent(contract -> {
                                    if (contract.getWage() != null) res.setBasicSalary(contract.getWage());
                                    if (contract.getHousingAllowance() != null) res.setHousingAllowance(contract.getHousingAllowance());
                                    if (contract.getTransportAllowance() != null) res.setTransportAllowance(contract.getTransportAllowance());
                                    if (contract.getOtherAllowance() != null) res.setOtherAllowance(contract.getOtherAllowance());
                                    if (contract.getTotalSalary() != null) res.setTotalSalary(contract.getTotalSalary());
                                    if (contract.getEndDate() != null && res.getContractEndDate() == null) res.setContractEndDate(contract.getEndDate());
                                });
                    }
                    return ResponseEntity.ok(res);
                })
                .orElse(ResponseEntity.notFound().build());
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

    @GetMapping("/clock-status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get own clock-in/online status for today")
    public ResponseEntity<Map<String, Object>> clockStatus(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        LocalDate today = LocalDate.now(DUBAI_ZONE);

        List<AttendanceActivity> activities = attendanceActivityRepository.findByEmployeeIdAndAttendanceDate(emp.getId(), today);
        AttendanceActivity active = activities.stream()
                .filter(a -> a.getClockOut() == null)
                .findFirst()
                .orElse(null);
        boolean online = active != null;

        java.time.Instant currentSessionStartUtc = null;
        if (active != null && active.getInDatetime() != null) {
            currentSessionStartUtc = active.getInDatetime().atZone(DUBAI_ZONE).toInstant();
        }

        final java.time.Instant finalStart = currentSessionStartUtc;

        return attendanceRepository.findByEmployeeIdAndAttendanceDate(emp.getId(), today)
                .map(att -> {
                    java.util.Map<String, Object> res = new java.util.HashMap<>();
                    res.put("online", online);
                    res.put("checkIn", att.getCheckIn() != null ? att.getCheckIn().toString() : "");
                    res.put("checkOut", att.getCheckOut() != null ? att.getCheckOut().toString() : "");
                    res.put("atWorkSecond", att.getAtWorkSecond() != null ? att.getAtWorkSecond() : 0);
                    res.put("currentSessionStartUtc", finalStart);
                    return ResponseEntity.ok(res);
                })
                .orElse(ResponseEntity.ok(Map.of(
                        "online", false,
                        "checkIn", "",
                        "checkOut", "",
                        "atWorkSecond", 0
                )));
    }

    @GetMapping("/my-attendance")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get own attendance records")
    public ResponseEntity<List<AttendanceResponse>> myAttendance(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Employee emp = resolveEmployee(auth);
        LocalDate today = LocalDate.now(DUBAI_ZONE);
        List<Attendance> records = (from != null && to != null)
                ? attendanceRepository.findByEmployeeIdAndAttendanceDateBetween(emp.getId(), from, to)
                : attendanceRepository.findByEmployeeId(emp.getId());

        List<AttendanceActivity> todayActivities = attendanceActivityRepository.findByEmployeeIdAndAttendanceDate(emp.getId(), today);
        AttendanceActivity active = todayActivities.stream()
                .filter(a -> a.getClockOut() == null)
                .findFirst()
                .orElse(null);

        java.time.Instant currentSessionStartUtc = null;
        if (active != null && active.getInDatetime() != null) {
            currentSessionStartUtc = active.getInDatetime().atZone(DUBAI_ZONE).toInstant();
        }

        final java.time.Instant finalStart = currentSessionStartUtc;

        return ResponseEntity.ok(records.stream().map(att -> {
            AttendanceResponse res = AttendanceResponse.from(att);
            if (att.getAttendanceDate().equals(today)) {
                res.setCurrentSessionStartUtc(finalStart);
            }
            return res;
        }).toList());
    }

    @PostMapping("/check-in")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Self check-in for today")
    public ResponseEntity<AttendanceResponse> checkIn(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        return ResponseEntity.ok(attendanceService.clockIn(emp.getId(), emp.getCompany().getId()));
    }

    @PostMapping("/check-out")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Self check-out for today")
    public ResponseEntity<?> checkOut(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        LocalDate today = LocalDate.now(DUBAI_ZONE);
        java.util.Optional<Attendance> opt = attendanceRepository.findByEmployeeIdAndAttendanceDate(emp.getId(), today);
        if (opt.isPresent()) {
            return ResponseEntity.ok(attendanceService.clockOut(opt.get().getId()));
        } else {
            return ResponseEntity.badRequest().body("No attendance record found for today.");
        }
    }

    @GetMapping("/my-validation-requests")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    @Operation(summary = "Get own attendance validation requests and their approval status")
    public ResponseEntity<List<AttendanceResponse>> myValidationRequests(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        List<AttendanceResponse> records = attendanceRepository.findByEmployeeId(emp.getId()).stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsValidateRequest()))
                .map(AttendanceResponse::from)
                .toList();
        return ResponseEntity.ok(records);
    }

    @PostMapping("/my-attendance/{id}/request-validation")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    @Operation(summary = "Request validation for own attendance record")
    public ResponseEntity<AttendanceResponse> requestValidation(
            @PathVariable Long id, Authentication auth) {
        Employee emp = resolveEmployee(auth);
        Attendance att = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", id));
        if (!att.getEmployee().getId().equals(emp.getId())) {
            return ResponseEntity.status(403).build();
        }
        att.setIsValidateRequest(true);
        att.setIsValidateRequestApproved(false);
        return ResponseEntity.ok(AttendanceResponse.from(attendanceRepository.save(att)));
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
