package com.example.demo.attendance.controller;

import com.example.demo.attendance.entity.AttendanceActivity;
import com.example.demo.attendance.repository.AttendanceActivityRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance/activities")
@RequiredArgsConstructor
@Tag(name = "Attendance Activities")
public class AttendanceActivityController {

    private final AttendanceActivityRepository attendanceActivityRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('attendance:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List attendance activities (company-scoped)")
    public ResponseEntity<List<AttendanceActivity>> list() {
        Specification<AttendanceActivity> spec = ScopeFilter.byEmployeeCompany();
        return ResponseEntity.ok(spec != null
                ? attendanceActivityRepository.findAll(spec)
                : attendanceActivityRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('attendance:create')")
    @Transactional
    @Operation(summary = "Create attendance activity")
    public ResponseEntity<AttendanceActivity> create(@RequestBody AttendanceActivity activity) {
        return ResponseEntity.ok(attendanceActivityRepository.save(activity));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('attendance:delete')")
    @Transactional
    @Operation(summary = "Delete attendance activity")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        AttendanceActivity activity = attendanceActivityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceActivity", id));
        activity.setActive(false);
        attendanceActivityRepository.save(activity);
        return ResponseEntity.ok(Map.of("message", "Activity deleted"));
    }

    @PostMapping("/bulk-delete")
    @PreAuthorize("hasAuthority('attendance:delete')")
    @Transactional
    @Operation(summary = "Bulk delete attendance activities")
    public ResponseEntity<Map<String, Object>> bulkDelete(@RequestBody List<Long> ids) {
        List<AttendanceActivity> activities = attendanceActivityRepository.findAllById(ids);
        activities.forEach(a -> a.setActive(false));
        attendanceActivityRepository.saveAll(activities);
        return ResponseEntity.ok(Map.of("message", "Deleted " + activities.size() + " activities"));
    }
}
