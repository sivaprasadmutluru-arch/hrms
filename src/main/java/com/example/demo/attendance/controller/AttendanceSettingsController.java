package com.example.demo.attendance.controller;

import com.example.demo.attendance.entity.*;
import com.example.demo.attendance.repository.*;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Attendance Settings")
public class AttendanceSettingsController {

    private final GraceTimeRepository graceTimeRepository;
    private final AttendanceValidationConditionRepository validationConditionRepository;
    private final AttendanceCommentRepository commentRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceGeneralSettingRepository generalSettingRepository;
    private final AttendanceAllowedIPRepository allowedIPRepository;
    private final AttendanceLateComeEarlyOutRepository lateComeEarlyOutRepository;
    private final BatchAttendanceRepository batchAttendanceRepository;
    private final WorkRecordRepository workRecordRepository;

    // ─── Grace Time ───────────────────────────────────────────────────────────

    @GetMapping("/grace-times")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List grace times (company-scoped)")
    public ResponseEntity<List<GraceTime>> listGraceTimes() {
        var spec = ScopeFilter.<GraceTime>byCompany();
        return ResponseEntity.ok(spec != null ? graceTimeRepository.findAll(spec) : graceTimeRepository.findAll());
    }

    @PostMapping("/grace-times")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a grace time")
    public ResponseEntity<GraceTime> createGraceTime(@RequestBody GraceTime graceTime) {
        if (graceTime.getCompany() != null && graceTime.getCompany().getId() != null) {
            graceTime.setCompany(companyRepository.getReferenceById(graceTime.getCompany().getId()));
        }
        return ResponseEntity.ok(graceTimeRepository.save(graceTime));
    }

    @PutMapping("/grace-times/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a grace time")
    public ResponseEntity<GraceTime> updateGraceTime(@PathVariable Long id, @RequestBody GraceTime updated) {
        GraceTime gt = graceTimeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GraceTime", id));
        gt.setAllowedTime(updated.getAllowedTime());
        gt.setAllowedTimeInSeconds(updated.getAllowedTimeInSeconds());
        gt.setAllowedClockIn(updated.getAllowedClockIn());
        gt.setAllowedClockOut(updated.getAllowedClockOut());
        gt.setIsDefault(updated.getIsDefault());
        return ResponseEntity.ok(graceTimeRepository.save(gt));
    }

    @DeleteMapping("/grace-times/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a grace time")
    public ResponseEntity<Void> deleteGraceTime(@PathVariable Long id) {
        graceTimeRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Validation Conditions ────────────────────────────────────────────────

    @GetMapping("/validation-conditions")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get attendance validation conditions for company")
    public ResponseEntity<AttendanceValidationCondition> getValidationConditions(@RequestParam Long companyId) {
        return validationConditionRepository.findByCompanyId(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/validation-conditions")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update attendance validation conditions")
    public ResponseEntity<AttendanceValidationCondition> updateValidationConditions(
            @RequestParam Long companyId,
            @RequestBody AttendanceValidationCondition updated) {
        AttendanceValidationCondition vc = validationConditionRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    AttendanceValidationCondition n = new AttendanceValidationCondition();
                    n.setCompany(companyRepository.getReferenceById(companyId));
                    return n;
                });
        vc.setValidationAtWork(updated.getValidationAtWork());
        vc.setMinimumOvertimeToApprove(updated.getMinimumOvertimeToApprove());
        vc.setOvertimeCutoff(updated.getOvertimeCutoff());
        vc.setAutoApproveOt(updated.getAutoApproveOt());
        return ResponseEntity.ok(validationConditionRepository.save(vc));
    }

    // ─── Attendance Comments ──────────────────────────────────────────────────

    @GetMapping("/{attendanceId}/comments")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get comments for an attendance record")
    public ResponseEntity<List<AttendanceComment>> getComments(@PathVariable Long attendanceId) {
        return ResponseEntity.ok(commentRepository.findByAttendanceId(attendanceId));
    }

    @PostMapping("/{attendanceId}/comments")
    @PreAuthorize("hasAuthority('attendance:create')")
    @Transactional
    @Operation(summary = "Add a comment to an attendance record")
    public ResponseEntity<AttendanceComment> addComment(
            @PathVariable Long attendanceId,
            @RequestBody AttendanceComment comment) {
        comment.setAttendance(attendanceRepository.getReferenceById(attendanceId));
        if (comment.getEmployee() != null && comment.getEmployee().getId() != null) {
            comment.setEmployee(employeeRepository.getReferenceById(comment.getEmployee().getId()));
        }
        return ResponseEntity.ok(commentRepository.save(comment));
    }

    // ─── General Settings ─────────────────────────────────────────────────────

    @GetMapping("/general-settings")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get attendance general settings for company")
    public ResponseEntity<AttendanceGeneralSetting> getGeneralSettings(@RequestParam Long companyId) {
        return generalSettingRepository.findByCompanyId(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/general-settings")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Upsert attendance general settings for company")
    public ResponseEntity<AttendanceGeneralSetting> upsertGeneralSettings(
            @RequestParam Long companyId,
            @RequestBody AttendanceGeneralSetting updated) {
        AttendanceGeneralSetting setting = generalSettingRepository.findByCompanyId(companyId)
                .orElseGet(() -> {
                    AttendanceGeneralSetting s = new AttendanceGeneralSetting();
                    s.setCompany(companyRepository.getReferenceById(companyId));
                    return s;
                });
        setting.setTimeRunner(updated.getTimeRunner());
        setting.setEnableCheckIn(updated.getEnableCheckIn());
        return ResponseEntity.ok(generalSettingRepository.save(setting));
    }

    // ─── Allowed IPs ──────────────────────────────────────────────────────────

    @GetMapping("/allowed-ips")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List allowed IPs for company")
    public ResponseEntity<List<AttendanceAllowedIP>> listAllowedIPs(@RequestParam Long companyId) {
        return ResponseEntity.ok(allowedIPRepository.findByCompanyId(companyId));
    }

    @PostMapping("/allowed-ips")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Add an allowed IP")
    public ResponseEntity<AttendanceAllowedIP> createAllowedIP(@RequestBody AttendanceAllowedIP ip) {
        if (ip.getCompany() != null && ip.getCompany().getId() != null) {
            ip.setCompany(companyRepository.getReferenceById(ip.getCompany().getId()));
        }
        return ResponseEntity.ok(allowedIPRepository.save(ip));
    }

    @PutMapping("/allowed-ips/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update an allowed IP")
    public ResponseEntity<AttendanceAllowedIP> updateAllowedIP(@PathVariable Long id, @RequestBody AttendanceAllowedIP updated) {
        AttendanceAllowedIP ip = allowedIPRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceAllowedIP", id));
        ip.setIpAddress(updated.getIpAddress());
        ip.setDescription(updated.getDescription());
        ip.setIsEnabled(updated.getIsEnabled());
        return ResponseEntity.ok(allowedIPRepository.save(ip));
    }

    @DeleteMapping("/allowed-ips/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete an allowed IP")
    public ResponseEntity<Void> deleteAllowedIP(@PathVariable Long id) {
        allowedIPRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Late Come / Early Out ────────────────────────────────────────────────

    @GetMapping("/late-come-early-out")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List late come / early out records (company-scoped)")
    public ResponseEntity<List<AttendanceLateComeEarlyOut>> listLateComeEarlyOut() {
        var spec = ScopeFilter.<AttendanceLateComeEarlyOut>byEmployee();
        return ResponseEntity.ok(spec != null
                ? lateComeEarlyOutRepository.findAll(spec)
                : lateComeEarlyOutRepository.findAll());
    }

    @GetMapping("/late-come-early-out/employee/{employeeId}")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get late/early records for a specific employee")
    public ResponseEntity<List<AttendanceLateComeEarlyOut>> getByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(lateComeEarlyOutRepository.findByEmployeeId(employeeId));
    }

    @GetMapping("/{attendanceId}/late-come-early-out")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get late/early records for a specific attendance record")
    public ResponseEntity<List<AttendanceLateComeEarlyOut>> getByAttendance(@PathVariable Long attendanceId) {
        return ResponseEntity.ok(lateComeEarlyOutRepository.findByAttendanceId(attendanceId));
    }

    @PostMapping("/late-come-early-out")
    @PreAuthorize("hasAuthority('attendance:create')")
    @Transactional
    @Operation(summary = "Create a late come / early out entry")
    public ResponseEntity<AttendanceLateComeEarlyOut> createLateComeEarlyOut(@RequestBody AttendanceLateComeEarlyOut entry) {
        if (entry.getAttendance() != null && entry.getAttendance().getId() != null) {
            entry.setAttendance(attendanceRepository.getReferenceById(entry.getAttendance().getId()));
        }
        if (entry.getEmployee() != null && entry.getEmployee().getId() != null) {
            entry.setEmployee(employeeRepository.getReferenceById(entry.getEmployee().getId()));
        }
        return ResponseEntity.ok(lateComeEarlyOutRepository.save(entry));
    }

    @DeleteMapping("/late-come-early-out/{id}")
    @PreAuthorize("hasAuthority('attendance:delete')")
    @Operation(summary = "Delete a late come / early out entry")
    public ResponseEntity<Void> deleteLateComeEarlyOut(@PathVariable Long id) {
        lateComeEarlyOutRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Batch Attendance ─────────────────────────────────────────────────────

    @GetMapping("/batches")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List batch attendance records (company-scoped)")
    public ResponseEntity<List<BatchAttendance>> listBatches() {
        var spec = ScopeFilter.<BatchAttendance>byCompany();
        return ResponseEntity.ok(spec != null
                ? batchAttendanceRepository.findAll(spec)
                : batchAttendanceRepository.findAll());
    }

    @PostMapping("/batches")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a batch attendance group")
    public ResponseEntity<BatchAttendance> createBatch(@RequestBody BatchAttendance batch) {
        if (batch.getCompany() != null && batch.getCompany().getId() != null) {
            batch.setCompany(companyRepository.getReferenceById(batch.getCompany().getId()));
        }
        return ResponseEntity.ok(batchAttendanceRepository.save(batch));
    }

    @PutMapping("/batches/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a batch attendance group")
    public ResponseEntity<BatchAttendance> updateBatch(@PathVariable Long id, @RequestBody BatchAttendance updated) {
        BatchAttendance batch = batchAttendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BatchAttendance", id));
        batch.setTitle(updated.getTitle());
        return ResponseEntity.ok(batchAttendanceRepository.save(batch));
    }

    @DeleteMapping("/batches/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a batch attendance group")
    public ResponseEntity<Void> deleteBatch(@PathVariable Long id) {
        batchAttendanceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Work Records ─────────────────────────────────────────────────────────

    @GetMapping("/work-records")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List work records (company-scoped, paginated)")
    public ResponseEntity<Page<WorkRecord>> listWorkRecords(@PageableDefault(size = 20) Pageable pageable) {
        var spec = ScopeFilter.<WorkRecord>byEmployee();
        return ResponseEntity.ok(spec != null
                ? workRecordRepository.findAll(spec, pageable)
                : workRecordRepository.findAll(pageable));
    }

    @GetMapping("/work-records/employee/{employeeId}")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get work records for a specific employee")
    public ResponseEntity<List<WorkRecord>> getWorkRecordsByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(workRecordRepository.findByEmployeeId(employeeId));
    }

    @PostMapping("/work-records")
    @PreAuthorize("hasAuthority('attendance:create')")
    @Transactional
    @Operation(summary = "Create a work record")
    public ResponseEntity<WorkRecord> createWorkRecord(@RequestBody WorkRecord record) {
        if (record.getEmployee() != null && record.getEmployee().getId() != null) {
            record.setEmployee(employeeRepository.getReferenceById(record.getEmployee().getId()));
        }
        if (record.getCompany() != null && record.getCompany().getId() != null) {
            record.setCompany(companyRepository.getReferenceById(record.getCompany().getId()));
        }
        return ResponseEntity.ok(workRecordRepository.save(record));
    }

    @PutMapping("/work-records/{id}")
    @PreAuthorize("hasAuthority('attendance:edit')")
    @Transactional
    @Operation(summary = "Update a work record")
    public ResponseEntity<WorkRecord> updateWorkRecord(@PathVariable Long id, @RequestBody WorkRecord updated) {
        WorkRecord record = workRecordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WorkRecord", id));
        record.setRecordName(updated.getRecordName());
        record.setWorkRecordType(updated.getWorkRecordType());
        record.setDate(updated.getDate());
        record.setAtWork(updated.getAtWork());
        record.setMinHour(updated.getMinHour());
        record.setAtWorkSecond(updated.getAtWorkSecond());
        record.setMinHourSecond(updated.getMinHourSecond());
        record.setNote(updated.getNote());
        record.setMessage(updated.getMessage());
        record.setIsAttendanceRecord(updated.getIsAttendanceRecord());
        record.setIsLeaveRecord(updated.getIsLeaveRecord());
        record.setDayPercentage(updated.getDayPercentage());
        return ResponseEntity.ok(workRecordRepository.save(record));
    }

    @DeleteMapping("/work-records/{id}")
    @PreAuthorize("hasAuthority('attendance:delete')")
    @Operation(summary = "Delete a work record")
    public ResponseEntity<Map<String, String>> deleteWorkRecord(@PathVariable Long id) {
        workRecordRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Work record deleted"));
    }
}
