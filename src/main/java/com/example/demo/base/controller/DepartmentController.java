package com.example.demo.base.controller;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Department;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.DepartmentRepository;
import com.example.demo.common.context.CompanyContext;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
@Tag(name = "Departments")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('department:view')")
    public ResponseEntity<List<Department>> list() {
        var companySpec = ScopeFilter.<Department>byCompany();
        org.springframework.data.jpa.domain.Specification<Department> activeSpec =
                (root, query, cb) -> cb.isTrue(root.get("isActive"));
        var spec = companySpec != null ? companySpec.and(activeSpec) : activeSpec;
        return ResponseEntity.ok(departmentRepository.findAll(spec));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('department:view')")
    public ResponseEntity<Department> get(@PathVariable Long id) {
        return ResponseEntity.ok(departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('department:create')")
    public ResponseEntity<Department> create(
            @RequestBody Department department,
            @RequestParam(required = false) Long companyId,
            @RequestParam(required = false) Long managerId) {
        Long effectiveCompanyId = companyId != null ? companyId : CompanyContext.get();
        if (effectiveCompanyId == null) {
            throw new IllegalArgumentException("companyId is required — pass it as a request parameter or send X-Company-Id header");
        }
        Company company = companyRepository.findById(effectiveCompanyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", effectiveCompanyId));
        department.setCompany(company);
        if (managerId != null) {
            Employee manager = employeeRepository.findById(managerId).orElse(null);
            department.setManager(manager);
        }
        return ResponseEntity.ok(departmentRepository.save(department));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('department:edit')")
    public ResponseEntity<Department> update(
            @PathVariable Long id,
            @RequestBody Department updated,
            @RequestParam(required = false) Long managerId) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", id));
        dept.setName(updated.getName());
        if (managerId != null) {
            Employee manager = employeeRepository.findById(managerId).orElse(null);
            dept.setManager(manager);
        }
        return ResponseEntity.ok(departmentRepository.save(dept));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('department:delete')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", id));
        dept.setActive(false);
        departmentRepository.save(dept);
        return ResponseEntity.ok(Map.of("message", "Department deactivated"));
    }
}
