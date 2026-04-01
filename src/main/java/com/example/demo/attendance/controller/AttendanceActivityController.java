package com.example.demo.attendance.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance/activities")
@Tag(name = "Attendance Activities")
public class AttendanceActivityController {

    @GetMapping
    @PreAuthorize("hasAuthority('attendance:view')")
    @Operation(summary = "List attendance activities")
    public ResponseEntity<List<Map<String, Object>>> list(@RequestParam(required = false) Long companyId) {
        return ResponseEntity.ok(List.of());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('attendance:create')")
    @Operation(summary = "Create attendance activity")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("message", "Activity created", "data", body));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('attendance:delete')")
    @Operation(summary = "Delete attendance activity")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("message", "Activity deleted"));
    }

    @PostMapping("/bulk-delete")
    @PreAuthorize("hasAuthority('attendance:delete')")
    @Operation(summary = "Bulk delete attendance activities")
    public ResponseEntity<Map<String, Object>> bulkDelete(@RequestBody List<Long> ids) {
        return ResponseEntity.ok(Map.of("message", "Deleted " + ids.size() + " activities"));
    }
}
