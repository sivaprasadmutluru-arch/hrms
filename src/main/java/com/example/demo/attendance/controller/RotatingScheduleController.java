package com.example.demo.attendance.controller;

import com.example.demo.base.entity.RotatingShift;
import com.example.demo.base.entity.RotatingWorkType;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.RotatingShiftRepository;
import com.example.demo.base.repository.RotatingWorkTypeRepository;
import com.example.demo.base.repository.WorkTypeRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

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
}
