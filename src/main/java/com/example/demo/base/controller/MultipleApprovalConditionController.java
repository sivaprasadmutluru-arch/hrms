package com.example.demo.base.controller;

import com.example.demo.base.entity.MultipleApprovalCondition;
import com.example.demo.base.repository.DepartmentRepository;
import com.example.demo.base.repository.MultipleApprovalConditionRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
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
@RequestMapping("/api/multiple-approval-conditions")
@RequiredArgsConstructor
@Tag(name = "Multiple Approval Conditions")
public class MultipleApprovalConditionController {

    private final MultipleApprovalConditionRepository repository;
    private final DepartmentRepository departmentRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "List all multiple approval conditions")
    public ResponseEntity<List<MultipleApprovalCondition>> list(
            @RequestParam(required = false) Long departmentId) {
        if (departmentId != null) {
            return ResponseEntity.ok(repository.findByDepartmentId(departmentId));
        }
        return ResponseEntity.ok(repository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create a multiple approval condition")
    public ResponseEntity<MultipleApprovalCondition> create(@RequestBody MultipleApprovalCondition condition) {
        if (condition.getDepartment() != null && condition.getDepartment().getId() != null) {
            condition.setDepartment(departmentRepository.getReferenceById(condition.getDepartment().getId()));
        }
        return ResponseEntity.ok(repository.save(condition));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update a multiple approval condition")
    public ResponseEntity<MultipleApprovalCondition> update(@PathVariable Long id,
                                                             @RequestBody MultipleApprovalCondition updated) {
        MultipleApprovalCondition c = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MultipleApprovalCondition", id));
        c.setConditionField(updated.getConditionField());
        c.setConditionOperator(updated.getConditionOperator());
        c.setConditionValue(updated.getConditionValue());
        c.setConditionStartValue(updated.getConditionStartValue());
        c.setConditionEndValue(updated.getConditionEndValue());
        if (updated.getDepartment() != null && updated.getDepartment().getId() != null) {
            c.setDepartment(departmentRepository.getReferenceById(updated.getDepartment().getId()));
        }
        return ResponseEntity.ok(repository.save(c));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete a multiple approval condition")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Condition deleted"));
    }
}
