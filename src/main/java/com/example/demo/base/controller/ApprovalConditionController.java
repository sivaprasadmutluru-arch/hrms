package com.example.demo.base.controller;

import com.example.demo.base.entity.ApprovalCondition;
import com.example.demo.base.entity.ApprovalConditionManager;
import com.example.demo.base.repository.ApprovalConditionManagerRepository;
import com.example.demo.base.repository.ApprovalConditionRepository;
import com.example.demo.base.repository.CompanyRepository;
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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/approval-conditions")
@RequiredArgsConstructor
@Tag(name = "Approval Conditions")
public class ApprovalConditionController {

    private final ApprovalConditionRepository conditionRepository;
    private final ApprovalConditionManagerRepository managerRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "List approval conditions (company-scoped)")
    public ResponseEntity<List<ApprovalCondition>> list() {
        var spec = ScopeFilter.<ApprovalCondition>byCompany();
        return ResponseEntity.ok(spec != null ? conditionRepository.findAll(spec) : conditionRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Create an approval condition")
    public ResponseEntity<ApprovalCondition> create(@RequestBody ApprovalCondition condition) {
        if (condition.getCompany() != null && condition.getCompany().getId() != null) {
            condition.setCompany(companyRepository.getReferenceById(condition.getCompany().getId()));
        }
        return ResponseEntity.ok(conditionRepository.save(condition));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Update an approval condition")
    public ResponseEntity<ApprovalCondition> update(@PathVariable Long id, @RequestBody ApprovalCondition updated) {
        ApprovalCondition c = conditionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ApprovalCondition", id));
        c.setConditionField(updated.getConditionField());
        c.setConditionOperator(updated.getConditionOperator());
        c.setConditionValue(updated.getConditionValue());
        c.setConditionStartValue(updated.getConditionStartValue());
        c.setConditionEndValue(updated.getConditionEndValue());
        return ResponseEntity.ok(conditionRepository.save(c));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Delete an approval condition")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        conditionRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Approval condition deleted"));
    }

    @GetMapping("/{id}/managers")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "List managers for an approval condition")
    public ResponseEntity<List<ApprovalConditionManager>> listManagers(@PathVariable Long id) {
        return ResponseEntity.ok(managerRepository.findByConditionIdOrderBySequenceAsc(id));
    }

    @PostMapping("/{id}/managers")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Add a manager to an approval condition")
    public ResponseEntity<ApprovalConditionManager> addManager(@PathVariable Long id, @RequestBody ApprovalConditionManager manager) {
        manager.setCondition(conditionRepository.getReferenceById(id));
        if (manager.getManager() != null && manager.getManager().getId() != null) {
            manager.setManager(employeeRepository.getReferenceById(manager.getManager().getId()));
        }
        return ResponseEntity.ok(managerRepository.save(manager));
    }
}
