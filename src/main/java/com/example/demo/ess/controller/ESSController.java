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
import com.example.demo.employee.entity.ProfileEditFeature;
import com.example.demo.employee.entity.EmployeeBankDetails;
import com.example.demo.employee.repository.EmployeeBankDetailsRepository;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.repository.EmployeeWorkInformationRepository;
import com.example.demo.employee.repository.ProfileEditFeatureRepository;
import com.example.demo.employee.service.EmployeeService;
import com.example.demo.leave.dto.AvailableLeaveDTO;
import com.example.demo.leave.dto.LeaveRequestDTO;
import com.example.demo.leave.entity.LeaveRequest;
import com.example.demo.leave.entity.LeaveType;
import com.example.demo.leave.dto.LeaveMapper;
import com.example.demo.leave.repository.AvailableLeaveRepository;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

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
    private final AvailableLeaveRepository availableLeaveRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceActivityRepository attendanceActivityRepository;
    private final AttendanceService attendanceService;
    private final PayslipRepository payslipRepository;
    private final LeaveService leaveService;
    private final ContractRepository contractRepository;
    private final ProfileEditFeatureRepository profileEditFeatureRepository;
    private final EmployeeBankDetailsRepository bankDetailsRepository;
    private final EmployeeService employeeService;

    // ── Profile ──────────────────────────────────────────────────────────────

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get own employee profile")
    public ResponseEntity<EmployeeResponse> me(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        Contract contract = contractRepository.findByEmployeeId(emp.getId()).stream().findFirst().orElse(null);
        return ResponseEntity.ok(EmployeeResponse.from(emp, contract));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update own employee profile (feature-gated)")
    public ResponseEntity<EmployeeResponse> updateMe(
            Authentication auth,
            @RequestBody Map<String, Object> body) {
        Employee emp = resolveEmployee(auth);
        Long companyId = emp.getCompany().getId();

        // Build feature map: featureName → isEditable
        Map<String, Boolean> features = new HashMap<>();
        profileEditFeatureRepository.findByCompanyId(companyId)
                .forEach(f -> features.put(f.getFeatureName(), Boolean.TRUE.equals(f.getIsEditable())));

        // Helper: check if a feature is enabled (default true if not configured)
        java.util.function.Function<String, Boolean> allowed =
                feat -> features.getOrDefault(feat, true);

        // Feature-gated: phone
        if (allowed.apply("phone") && body.containsKey("phone"))
            emp.setPhone((String) body.get("phone"));

        // Feature-gated: address
        if (allowed.apply("address")) {
            if (body.containsKey("permanentAddress"))
                emp.setPermanentAddress((String) body.get("permanentAddress"));
            if (body.containsKey("currentAddress"))
                emp.setCurrentAddress((String) body.get("currentAddress"));
            if (body.containsKey("country"))
                emp.setCountry((String) body.get("country"));
            if (body.containsKey("state"))
                emp.setState((String) body.get("state"));
            if (body.containsKey("city"))
                emp.setCity((String) body.get("city"));
            if (body.containsKey("zip"))
                emp.setZip((String) body.get("zip"));
        }

        // Feature-gated: date_of_birth
        if (allowed.apply("date_of_birth") && body.containsKey("dateOfBirth")) {
            String dob = (String) body.get("dateOfBirth");
            emp.setDateOfBirth(dob != null && !dob.isEmpty() ? LocalDate.parse(dob) : null);
        }

        // Feature-gated: emergency_contact
        if (allowed.apply("emergency_contact")) {
            if (body.containsKey("emergencyContactName"))
                emp.setEmergencyContactName((String) body.get("emergencyContactName"));
            if (body.containsKey("emergencyContact"))
                emp.setEmergencyContact((String) body.get("emergencyContact"));
            if (body.containsKey("emergencyContactRelation"))
                emp.setEmergencyContactRelation((String) body.get("emergencyContactRelation"));
        }

        emp = employeeRepository.save(emp);
        Contract contract = contractRepository.findByEmployeeId(emp.getId()).stream().findFirst().orElse(null);
        return ResponseEntity.ok(EmployeeResponse.from(emp, contract));
    }

    @PostMapping(value = "/me/photo", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload own profile photo (feature-gated: profile_image)")
    public ResponseEntity<Map<String, String>> uploadMyPhoto(
            Authentication auth,
            @RequestParam("file") MultipartFile file) throws IOException {
        Employee emp = resolveEmployee(auth);
        // Gate the upload behind the same "profile_image" feature flag the frontend already checks
        checkFeature(emp, "profile_image");
        String path = employeeService.uploadPhoto(emp.getId(), file);
        return ResponseEntity.ok(Map.of("photoPath", path));
    }

    @GetMapping("/profile-features")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get profile edit features for own company")
    public ResponseEntity<List<ProfileEditFeature>> myProfileFeatures(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        return ResponseEntity.ok(profileEditFeatureRepository.findByCompanyId(emp.getCompany().getId()));
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
                    // Merge salary from contract if not set in WorkInformation.
                    // Mirrors admin endpoint: check all 4 fields, prefer ACTIVE over DRAFT.
                    if (res.getBasicSalary() == null && res.getHousingAllowance() == null
                            && res.getTransportAllowance() == null && res.getOtherAllowance() == null) {
                        contractRepository.findByEmployeeIdAndContractStatusIn(emp.getId(),
                                java.util.List.of(com.example.demo.payroll.entity.Contract.ContractStatus.ACTIVE,
                                                  com.example.demo.payroll.entity.Contract.ContractStatus.DRAFT))
                                .stream()
                                .min(java.util.Comparator.comparingInt(c ->
                                        c.getContractStatus() == com.example.demo.payroll.entity.Contract.ContractStatus.ACTIVE ? 0 : 1))
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
    @Operation(summary = "Get employee's leave requests")
    public ResponseEntity<List<LeaveRequestDTO>> myLeave(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        List<LeaveRequestDTO> dtos = leaveRequestRepository.findByEmployeeId(emp.getId())
                .stream().map(LeaveMapper::toDTO).toList();
        return ResponseEntity.ok(dtos);
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
    @Operation(summary = "Get own IRREGULAR attendance records (eligible for regularisation)")
    public ResponseEntity<List<AttendanceResponse>> myValidationRequests(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        List<AttendanceResponse> records = attendanceRepository.findByEmployeeId(emp.getId()).stream()
                .filter(a -> a.getAttendanceStatus() == com.example.demo.attendance.entity.Attendance.AttendanceQualityStatus.IRREGULAR)
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
        // Validation request is now a regularisation request — employee should use
        // POST /api/attendance/regularisation. This endpoint is kept for backwards
        // compatibility but no longer flips removed fields.
        return ResponseEntity.ok(AttendanceResponse.from(att));
    }

    // ── Payslips ──────────────────────────────────────────────────────────────

    @GetMapping("/my-payslips")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get own payslips")
    public ResponseEntity<List<Payslip>> myPayslips(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        return ResponseEntity.ok(payslipRepository.findByEmployeeId(emp.getId()));
    }

    // ── Leave balance (own) ───────────────────────────────────────────────────

    @GetMapping("/my-balance")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    @Operation(summary = "Get own leave balance per leave type")
    public ResponseEntity<List<AvailableLeaveDTO>> myBalance(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        java.util.Map<Long, Double> usedByType = new java.util.HashMap<>();
        leaveRequestRepository.sumApprovedDaysByLeaveTypeForEmployee(emp.getId())
                .forEach(row -> usedByType.put(((Number) row[0]).longValue(), ((Number) row[1]).doubleValue()));
        List<AvailableLeaveDTO> balance = availableLeaveRepository.findByEmployeeId(emp.getId()).stream()
                .map(al -> {
                    Long ltId = al.getLeaveType() != null ? al.getLeaveType().getId() : null;
                    double used = ltId != null ? usedByType.getOrDefault(ltId, 0.0) : 0.0;
                    return LeaveMapper.toDTO(al, used);
                })
                .toList();
        return ResponseEntity.ok(balance);
    }

    // ── Leave types (for apply-leave form) ───────────────────────────────────

    @GetMapping("/leave-types")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get available leave types for own company")
    public ResponseEntity<List<LeaveType>> leaveTypes(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        return ResponseEntity.ok(leaveService.getLeaveTypes());
    }

    // ── Bank Details (self-service) ───────────────────────────────────────────

    @GetMapping("/bank-details")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    @Operation(summary = "Get own bank details")
    public ResponseEntity<EmployeeBankDetails> myBankDetails(Authentication auth) {
        Employee emp = resolveEmployee(auth);
        return bankDetailsRepository.findByEmployeeId(emp.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/bank-details")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add own bank details (requires bank_details feature enabled)")
    public ResponseEntity<EmployeeBankDetails> createMyBankDetails(Authentication auth,
                                                                     @RequestBody EmployeeBankDetails bankDetails) {
        Employee emp = resolveEmployee(auth);
        checkFeature(emp, "bank_details");
        bankDetails.setEmployee(emp);
        return ResponseEntity.ok(bankDetailsRepository.save(bankDetails));
    }

    @PutMapping("/bank-details")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update own bank details (requires bank_details feature enabled)")
    public ResponseEntity<EmployeeBankDetails> updateMyBankDetails(Authentication auth,
                                                                     @RequestBody EmployeeBankDetails updated) {
        Employee emp = resolveEmployee(auth);
        checkFeature(emp, "bank_details");
        EmployeeBankDetails bd = bankDetailsRepository.findByEmployeeId(emp.getId())
                .orElseGet(() -> {
                    EmployeeBankDetails n = new EmployeeBankDetails();
                    n.setEmployee(emp);
                    return n;
                });
        bd.setBankName(updated.getBankName());
        bd.setAccountNumber(updated.getAccountNumber());
        bd.setBranch(updated.getBranch());
        bd.setCountry(updated.getCountry());
        bd.setState(updated.getState());
        bd.setCity(updated.getCity());
        bd.setIfscCode(updated.getIfscCode());
        bd.setSwiftCode(updated.getSwiftCode());
        bd.setAddress(updated.getAddress());
        return ResponseEntity.ok(bankDetailsRepository.save(bd));
    }

    private void checkFeature(Employee emp, String featureName) {
        profileEditFeatureRepository.findByCompanyId(emp.getCompany().getId()).stream()
                .filter(f -> featureName.equals(f.getFeatureName()))
                .findFirst()
                .ifPresent(f -> {
                    if (!Boolean.TRUE.equals(f.getIsEditable())) {
                        throw new org.springframework.security.access.AccessDeniedException(
                                "Feature '" + featureName + "' is disabled by your administrator.");
                    }
                });
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private Employee resolveEmployee(Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return employeeRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No employee record linked to your user account. Contact your HR admin."));
    }
}
