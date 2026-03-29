package com.example.demo.accessibility.controller;

import com.example.demo.accessibility.entity.DefaultAccessibility;
import com.example.demo.accessibility.repository.DefaultAccessibilityRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/accessibility")
@RequiredArgsConstructor
@Tag(name = "Accessibility")
public class AccessibilityController {

    private final DefaultAccessibilityRepository defaultAccessibilityRepository;
    private final EmployeeRepository employeeRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<List<DefaultAccessibility>> listAll() {
        return ResponseEntity.ok(defaultAccessibilityRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<DefaultAccessibility> getById(@PathVariable Long id) {
        DefaultAccessibility da = defaultAccessibilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DefaultAccessibility", id));
        return ResponseEntity.ok(da);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<DefaultAccessibility> create(@RequestBody DefaultAccessibility request) {
        DefaultAccessibility da = new DefaultAccessibility();
        da.setFeature(request.getFeature());
        da.setFilter(request.getFilter());
        da.setExcludeAll(request.isExcludeAll());
        da.setEnabled(request.isEnabled());
        return ResponseEntity.ok(defaultAccessibilityRepository.save(da));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<DefaultAccessibility> update(@PathVariable Long id,
                                                       @RequestBody DefaultAccessibility request) {
        DefaultAccessibility da = defaultAccessibilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DefaultAccessibility", id));
        da.setFeature(request.getFeature());
        da.setFilter(request.getFilter());
        da.setExcludeAll(request.isExcludeAll());
        da.setEnabled(request.isEnabled());
        return ResponseEntity.ok(defaultAccessibilityRepository.save(da));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        defaultAccessibilityRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @PostMapping("/{id}/employees")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<DefaultAccessibility> addEmployees(@PathVariable Long id,
                                                             @RequestBody List<Long> employeeIds) {
        DefaultAccessibility da = defaultAccessibilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DefaultAccessibility", id));
        for (Long empId : employeeIds) {
            Employee emp = employeeRepository.findById(empId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee", empId));
            if (!da.getEmployees().contains(emp)) {
                da.getEmployees().add(emp);
            }
        }
        return ResponseEntity.ok(defaultAccessibilityRepository.save(da));
    }

    @DeleteMapping("/{id}/employees/{employeeId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    public ResponseEntity<Map<String, String>> removeEmployee(@PathVariable Long id,
                                                              @PathVariable Long employeeId) {
        DefaultAccessibility da = defaultAccessibilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DefaultAccessibility", id));
        da.getEmployees().removeIf(emp -> emp.getId().equals(employeeId));
        defaultAccessibilityRepository.save(da);
        return ResponseEntity.ok(Map.of("message", "Employee removed from accessibility config"));
    }
}
