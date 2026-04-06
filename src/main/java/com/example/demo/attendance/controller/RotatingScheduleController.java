package com.example.demo.attendance.controller;

import com.example.demo.base.entity.RotatingShift;
import com.example.demo.base.entity.RotatingShiftAssign;
import com.example.demo.base.entity.RotatingWorkType;
import com.example.demo.base.entity.RotatingWorkTypeAssign;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.RotatingShiftAssignRepository;
import com.example.demo.base.repository.RotatingShiftRepository;
import com.example.demo.base.repository.RotatingWorkTypeAssignRepository;
import com.example.demo.base.repository.RotatingWorkTypeRepository;
import com.example.demo.base.repository.ShiftScheduleRepository;
import com.example.demo.base.repository.WorkTypeRepository;
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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Rotating Schedules")
public class RotatingScheduleController {

    private final RotatingShiftRepository rotatingShiftRepository;
    private final RotatingWorkTypeRepository rotatingWorkTypeRepository;
    private final WorkTypeRepository workTypeRepository;
    private final CompanyRepository companyRepository;
    private final RotatingShiftAssignRepository rotatingShiftAssignRepository;
    private final RotatingWorkTypeAssignRepository rotatingWorkTypeAssignRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;

    // ─── Rotating Shifts ──────────────────────────────────────────────────────

    @GetMapping("/rotating-shifts")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List rotating shifts (company-scoped)")
    public ResponseEntity<List<RotatingShift>> listRotatingShifts() {
        var spec = ScopeFilter.<RotatingShift>byCompany();
        return ResponseEntity.ok(spec != null ? rotatingShiftRepository.findAll(spec) : rotatingShiftRepository.findAll());
    }

    @PostMapping("/rotating-shifts")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a rotating shift")
    public ResponseEntity<RotatingShift> createRotatingShift(@RequestBody RotatingShift rs) {
        if (rs.getCompany() != null && rs.getCompany().getId() != null) {
            rs.setCompany(companyRepository.getReferenceById(rs.getCompany().getId()));
        }
        return ResponseEntity.ok(rotatingShiftRepository.save(rs));
    }

    @PutMapping("/rotating-shifts/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a rotating shift")
    public ResponseEntity<RotatingShift> updateRotatingShift(@PathVariable Long id, @RequestBody RotatingShift updated) {
        RotatingShift rs = rotatingShiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RotatingShift", id));
        rs.setName(updated.getName());
        return ResponseEntity.ok(rotatingShiftRepository.save(rs));
    }

    @DeleteMapping("/rotating-shifts/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a rotating shift")
    public ResponseEntity<Map<String, String>> deleteRotatingShift(@PathVariable Long id) {
        rotatingShiftRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Rotating shift deleted"));
    }

    // ─── Rotating Work Types ──────────────────────────────────────────────────

    @GetMapping("/rotating-work-types")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List rotating work types (company-scoped)")
    public ResponseEntity<List<RotatingWorkType>> listRotatingWorkTypes() {
        var spec = ScopeFilter.<RotatingWorkType>byCompany();
        return ResponseEntity.ok(spec != null ? rotatingWorkTypeRepository.findAll(spec) : rotatingWorkTypeRepository.findAll());
    }

    @PostMapping("/rotating-work-types")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a rotating work type")
    public ResponseEntity<RotatingWorkType> createRotatingWorkType(@RequestBody RotatingWorkType rwt) {
        if (rwt.getWorkType1() != null && rwt.getWorkType1().getId() != null) {
            rwt.setWorkType1(workTypeRepository.getReferenceById(rwt.getWorkType1().getId()));
        }
        if (rwt.getWorkType2() != null && rwt.getWorkType2().getId() != null) {
            rwt.setWorkType2(workTypeRepository.getReferenceById(rwt.getWorkType2().getId()));
        }
        if (rwt.getCompany() != null && rwt.getCompany().getId() != null) {
            rwt.setCompany(companyRepository.getReferenceById(rwt.getCompany().getId()));
        }
        return ResponseEntity.ok(rotatingWorkTypeRepository.save(rwt));
    }

    @PutMapping("/rotating-work-types/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a rotating work type")
    public ResponseEntity<RotatingWorkType> updateRotatingWorkType(@PathVariable Long id, @RequestBody RotatingWorkType updated) {
        RotatingWorkType rwt = rotatingWorkTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RotatingWorkType", id));
        rwt.setName(updated.getName());
        if (updated.getWorkType1() != null && updated.getWorkType1().getId() != null) {
            rwt.setWorkType1(workTypeRepository.getReferenceById(updated.getWorkType1().getId()));
        }
        if (updated.getWorkType2() != null && updated.getWorkType2().getId() != null) {
            rwt.setWorkType2(workTypeRepository.getReferenceById(updated.getWorkType2().getId()));
        }
        return ResponseEntity.ok(rotatingWorkTypeRepository.save(rwt));
    }

    @DeleteMapping("/rotating-work-types/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a rotating work type")
    public ResponseEntity<Map<String, String>> deleteRotatingWorkType(@PathVariable Long id) {
        rotatingWorkTypeRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Rotating work type deleted"));
    }

    // ─── Rotating Shift Assigns ───────────────────────────────────────────────

    @GetMapping("/rotating-shift-assigns")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List rotating shift assigns for a company")
    public ResponseEntity<List<RotatingShiftAssign>> listRotatingShiftAssigns(@RequestParam Long companyId) {
        return ResponseEntity.ok(rotatingShiftAssignRepository.findByEmployeeCompanyId(companyId));
    }

    @GetMapping("/rotating-shift-assigns/employee/{empId}")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get rotating shift assigns for an employee")
    public ResponseEntity<List<RotatingShiftAssign>> listRotatingShiftAssignsByEmployee(@PathVariable Long empId) {
        return ResponseEntity.ok(rotatingShiftAssignRepository.findByEmployeeId(empId));
    }

    @PostMapping("/rotating-shift-assigns")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a rotating shift assignment")
    public ResponseEntity<RotatingShiftAssign> createRotatingShiftAssign(@RequestBody RotatingShiftAssign assign) {
        if (assign.getEmployee() != null && assign.getEmployee().getId() != null) {
            assign.setEmployee(employeeRepository.getReferenceById(assign.getEmployee().getId()));
        }
        if (assign.getRotatingShift() != null && assign.getRotatingShift().getId() != null) {
            assign.setRotatingShift(rotatingShiftRepository.getReferenceById(assign.getRotatingShift().getId()));
        }
        return ResponseEntity.ok(rotatingShiftAssignRepository.save(assign));
    }

    @PutMapping("/rotating-shift-assigns/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a rotating shift assignment")
    public ResponseEntity<RotatingShiftAssign> updateRotatingShiftAssign(@PathVariable Long id, @RequestBody RotatingShiftAssign updated) {
        RotatingShiftAssign assign = rotatingShiftAssignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RotatingShiftAssign", id));
        if (updated.getStartDate() != null) {
            assign.setStartDate(updated.getStartDate());
        }
        if (updated.getBasedOn() != null) {
            assign.setBasedOn(updated.getBasedOn());
        }
        if (updated.getRotateEvery() != null) {
            assign.setRotateEvery(updated.getRotateEvery());
        }
        if (updated.getRotateAfterEvery() != null) {
            assign.setRotateAfterEvery(updated.getRotateAfterEvery());
        }
        if (updated.getRotateAfterEveryCount() != null) {
            assign.setRotateAfterEveryCount(updated.getRotateAfterEveryCount());
        }
        if (updated.getNextChangeDate() != null) {
            assign.setNextChangeDate(updated.getNextChangeDate());
        }
        if (updated.getRotatingShift() != null && updated.getRotatingShift().getId() != null) {
            assign.setRotatingShift(rotatingShiftRepository.getReferenceById(updated.getRotatingShift().getId()));
        }
        return ResponseEntity.ok(rotatingShiftAssignRepository.save(assign));
    }

    @DeleteMapping("/rotating-shift-assigns/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Delete a rotating shift assignment")
    public ResponseEntity<Map<String, String>> deleteRotatingShiftAssign(@PathVariable Long id) {
        if (!rotatingShiftAssignRepository.existsById(id)) {
            throw new ResourceNotFoundException("RotatingShiftAssign", id);
        }
        rotatingShiftAssignRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Rotating shift assignment deleted"));
    }

    @PostMapping("/rotating-shift-assigns/bulk-assign")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Bulk assign rotating shift to employees")
    public ResponseEntity<List<RotatingShiftAssign>> bulkAssignRotatingShift(@RequestBody BulkRotatingShiftAssignRequest request) {
        RotatingShift rotatingShift = rotatingShiftRepository.findById(request.getRotatingShiftId())
                .orElseThrow(() -> new ResourceNotFoundException("RotatingShift", request.getRotatingShiftId()));

        List<RotatingShiftAssign> assigns = new ArrayList<>();
        for (Long empId : request.getEmployeeIds()) {
            RotatingShiftAssign assign = new RotatingShiftAssign();
            assign.setEmployee(employeeRepository.getReferenceById(empId));
            assign.setRotatingShift(rotatingShift);
            if (request.getShiftId() != null) {
                assign.setShift(shiftScheduleRepository.getReferenceById(request.getShiftId()));
            }
            if (request.getStartDate() != null) {
                assign.setStartDate(LocalDate.parse(request.getStartDate()));
            }
            if (request.getBasedOn() != null) {
                assign.setBasedOn(request.getBasedOn());
            }
            if (request.getRotateEvery() != null) {
                assign.setRotateEvery(request.getRotateEvery());
            }
            assigns.add(assign);
        }
        return ResponseEntity.ok(rotatingShiftAssignRepository.saveAll(assigns));
    }

    // ─── Rotating Work Type Assigns ───────────────────────────────────────────

    @GetMapping("/rotating-work-type-assigns")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List rotating work type assigns for a company")
    public ResponseEntity<List<RotatingWorkTypeAssign>> listRotatingWorkTypeAssigns(@RequestParam Long companyId) {
        return ResponseEntity.ok(rotatingWorkTypeAssignRepository.findByEmployeeCompanyId(companyId));
    }

    @GetMapping("/rotating-work-type-assigns/employee/{empId}")
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get rotating work type assigns for an employee")
    public ResponseEntity<List<RotatingWorkTypeAssign>> listRotatingWorkTypeAssignsByEmployee(@PathVariable Long empId) {
        return ResponseEntity.ok(rotatingWorkTypeAssignRepository.findByEmployeeId(empId));
    }

    @PostMapping("/rotating-work-type-assigns")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a rotating work type assignment")
    public ResponseEntity<RotatingWorkTypeAssign> createRotatingWorkTypeAssign(@RequestBody RotatingWorkTypeAssign assign) {
        if (assign.getEmployee() != null && assign.getEmployee().getId() != null) {
            assign.setEmployee(employeeRepository.getReferenceById(assign.getEmployee().getId()));
        }
        if (assign.getRotatingWorkType() != null && assign.getRotatingWorkType().getId() != null) {
            assign.setRotatingWorkType(rotatingWorkTypeRepository.getReferenceById(assign.getRotatingWorkType().getId()));
        }
        if (assign.getWorkType() != null && assign.getWorkType().getId() != null) {
            assign.setWorkType(workTypeRepository.getReferenceById(assign.getWorkType().getId()));
        }
        return ResponseEntity.ok(rotatingWorkTypeAssignRepository.save(assign));
    }

    @PutMapping("/rotating-work-type-assigns/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a rotating work type assignment")
    public ResponseEntity<RotatingWorkTypeAssign> updateRotatingWorkTypeAssign(@PathVariable Long id, @RequestBody RotatingWorkTypeAssign updated) {
        RotatingWorkTypeAssign assign = rotatingWorkTypeAssignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RotatingWorkTypeAssign", id));
        if (updated.getStartDate() != null) {
            assign.setStartDate(updated.getStartDate());
        }
        if (updated.getBasedOn() != null) {
            assign.setBasedOn(updated.getBasedOn());
        }
        if (updated.getRotateEvery() != null) {
            assign.setRotateEvery(updated.getRotateEvery());
        }
        if (updated.getRotateAfterEvery() != null) {
            assign.setRotateAfterEvery(updated.getRotateAfterEvery());
        }
        if (updated.getRotateAfterEveryCount() != null) {
            assign.setRotateAfterEveryCount(updated.getRotateAfterEveryCount());
        }
        if (updated.getNextChangeDate() != null) {
            assign.setNextChangeDate(updated.getNextChangeDate());
        }
        if (updated.getRotatingWorkType() != null && updated.getRotatingWorkType().getId() != null) {
            assign.setRotatingWorkType(rotatingWorkTypeRepository.getReferenceById(updated.getRotatingWorkType().getId()));
        }
        return ResponseEntity.ok(rotatingWorkTypeAssignRepository.save(assign));
    }

    @DeleteMapping("/rotating-work-type-assigns/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Delete a rotating work type assignment")
    public ResponseEntity<Map<String, String>> deleteRotatingWorkTypeAssign(@PathVariable Long id) {
        if (!rotatingWorkTypeAssignRepository.existsById(id)) {
            throw new ResourceNotFoundException("RotatingWorkTypeAssign", id);
        }
        rotatingWorkTypeAssignRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Rotating work type assignment deleted"));
    }

    @PostMapping("/rotating-work-type-assigns/bulk-assign")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Bulk assign rotating work type to employees")
    public ResponseEntity<List<RotatingWorkTypeAssign>> bulkAssignRotatingWorkType(@RequestBody BulkRotatingWorkTypeAssignRequest request) {
        RotatingWorkType rotatingWorkType = rotatingWorkTypeRepository.findById(request.getRotatingWorkTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("RotatingWorkType", request.getRotatingWorkTypeId()));

        List<RotatingWorkTypeAssign> assigns = new ArrayList<>();
        for (Long empId : request.getEmployeeIds()) {
            RotatingWorkTypeAssign assign = new RotatingWorkTypeAssign();
            assign.setEmployee(employeeRepository.getReferenceById(empId));
            assign.setRotatingWorkType(rotatingWorkType);
            if (request.getWorkTypeId() != null) {
                assign.setWorkType(workTypeRepository.getReferenceById(request.getWorkTypeId()));
            }
            if (request.getStartDate() != null) {
                assign.setStartDate(LocalDate.parse(request.getStartDate()));
            }
            assigns.add(assign);
        }
        return ResponseEntity.ok(rotatingWorkTypeAssignRepository.saveAll(assigns));
    }

    // ─── Request DTOs ─────────────────────────────────────────────────────────

    @lombok.Data
    public static class BulkRotatingShiftAssignRequest {
        private List<Long> employeeIds;
        private Long rotatingShiftId;
        private Long shiftId;
        private String startDate;
        private String basedOn;
        private String rotateEvery;
    }

    @lombok.Data
    public static class BulkRotatingWorkTypeAssignRequest {
        private List<Long> employeeIds;
        private Long rotatingWorkTypeId;
        private Long workTypeId;
        private String startDate;
    }
}
