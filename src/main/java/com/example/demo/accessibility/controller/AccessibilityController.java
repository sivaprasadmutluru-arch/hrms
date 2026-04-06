package com.example.demo.accessibility.controller;

import com.example.demo.accessibility.entity.DefaultAccessibility;
import com.example.demo.accessibility.service.AccessibilityService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/accessibility")
@RequiredArgsConstructor
@Tag(name = "Accessibility")
public class AccessibilityController {

    private final AccessibilityService accessibilityService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DefaultAccessibility>> listAll() {
        return ResponseEntity.ok(accessibilityService.listAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DefaultAccessibility> getById(@PathVariable Long id) {
        return ResponseEntity.ok(accessibilityService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<DefaultAccessibility> create(@RequestBody DefaultAccessibility request) {
        return ResponseEntity.ok(accessibilityService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<DefaultAccessibility> update(@PathVariable Long id,
                                                       @RequestBody DefaultAccessibility request) {
        return ResponseEntity.ok(accessibilityService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        accessibilityService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @PostMapping("/{id}/employees")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<DefaultAccessibility> addEmployees(@PathVariable Long id,
                                                             @RequestBody List<Long> employeeIds) {
        return ResponseEntity.ok(accessibilityService.addEmployees(id, employeeIds));
    }

    @DeleteMapping("/{id}/employees/{employeeId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> removeEmployee(@PathVariable Long id,
                                                              @PathVariable Long employeeId) {
        accessibilityService.removeEmployee(id, employeeId);
        return ResponseEntity.ok(Map.of("message", "Employee removed from accessibility config"));
    }
}
