package com.example.demo.employee.controller;

import com.example.demo.base.entity.Department;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.DepartmentRepository;
import com.example.demo.base.repository.JobPositionRepository;
import com.example.demo.base.repository.JobRoleRepository;
import com.example.demo.base.repository.ShiftScheduleRepository;
import com.example.demo.base.repository.WorkTypeRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.dto.EmployeeRequest;
import com.example.demo.employee.dto.EmployeeResponse;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.entity.EmployeeTag;
import com.example.demo.employee.entity.EmployeeWorkInformation;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.repository.EmployeeTagRepository;
import com.example.demo.employee.repository.EmployeeWorkInformationRepository;
import com.example.demo.employee.service.EmployeeService;
import com.example.demo.employee.service.GlobalEmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@Tag(name = "Employees")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final GlobalEmployeeService globalEmployeeService;
    private final EmployeeRepository employeeRepository;
    private final EmployeeTagRepository employeeTagRepository;
    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;
    private final JobRoleRepository jobRoleRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;
    private final WorkTypeRepository workTypeRepository;
    private final EmployeeWorkInformationRepository employeeWorkInformationRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('employee:view')")
    @Operation(summary = "List all employees (company-scoped)")
    public ResponseEntity<Page<EmployeeResponse>> list(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(employeeService.getAll(pageable));
    }

    @GetMapping("/global")
    @PreAuthorize("hasRole('PLATFORM_SUPER_ADMIN')")
    @Operation(summary = "List ALL employees across every organization (Super Admin only)")
    public ResponseEntity<Page<EmployeeResponse>> listGlobal(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(globalEmployeeService.getAllAcrossOrgs(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('employee:view')")
    @Operation(summary = "Get employee by ID")
    public ResponseEntity<EmployeeResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(employeeService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('employee:create')")
    @Operation(summary = "Create a new employee")
    public ResponseEntity<EmployeeResponse> create(@Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.ok(employeeService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('employee:edit')")
    @Operation(summary = "Update employee")
    public ResponseEntity<EmployeeResponse> update(@PathVariable Long id,
                                                    @Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.ok(employeeService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('employee:delete')")
    @Operation(summary = "Soft delete employee")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        employeeService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Employee deactivated"));
    }

    @PostMapping("/{id}/photo")
    @PreAuthorize("hasAuthority('employee:edit')")
    @Operation(summary = "Upload employee photo")
    public ResponseEntity<Map<String, String>> uploadPhoto(@PathVariable Long id,
                                                            @RequestParam("file") MultipartFile file) throws IOException {
        String path = employeeService.uploadPhoto(id, file);
        return ResponseEntity.ok(Map.of("photoPath", path));
    }

    @GetMapping("/by-tag/{tagId}")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    @Operation(summary = "Get employees that have a specific tag")
    public ResponseEntity<List<EmployeeResponse>> getByTag(@PathVariable Long tagId) {
        EmployeeTag tag = employeeTagRepository.findById(tagId)
                .orElseThrow(() -> new com.example.demo.common.exception.ResourceNotFoundException("EmployeeTag", tagId));
        List<EmployeeResponse> employees = tag.getEmployees().stream()
                .map(EmployeeResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(employees);
    }

    @PostMapping("/bulk-toggle-active")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Bulk activate or deactivate employees")
    public ResponseEntity<Map<String, String>> bulkToggleActive(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) body.get("ids");
        Boolean active = (Boolean) body.get("active");
        if (ids == null || active == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "ids and active fields are required"));
        }
        List<Long> longIds = ids.stream().map(Integer::longValue).collect(Collectors.toList());
        List<Employee> employees = employeeRepository.findAllById(longIds);
        employees.forEach(e -> e.setActive(active));
        employeeRepository.saveAll(employees);
        return ResponseEntity.ok(Map.of("message", "Updated " + employees.size() + " employees"));
    }

    // ─── Org Chart ────────────────────────────────────────────────────────────

    @GetMapping("/org-chart")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get org chart grouped by manager for a company")
    public ResponseEntity<List<Map<String, Object>>> orgChart(@RequestParam Long companyId) {
        List<Employee> all = employeeRepository.findByCompanyId(companyId);

        Map<Long, Map<String, Object>> nodeMap = new LinkedHashMap<>();
        for (Employee e : all) {
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("id", e.getId());
            node.put("name", (e.getFirstName() != null ? e.getFirstName() : "") + " " +
                    (e.getLastName() != null ? e.getLastName() : ""));
            node.put("position", e.getJobPosition() != null ? e.getJobPosition().getName() : null);
            node.put("department", e.getDepartment() != null ? e.getDepartment().getName() : null);
            node.put("managerId", e.getReportingManager() != null ? e.getReportingManager().getId() : null);
            node.put("children", new ArrayList<>());
            nodeMap.put(e.getId(), node);
        }

        List<Map<String, Object>> roots = new ArrayList<>();
        for (Map<String, Object> node : nodeMap.values()) {
            Long managerId = (Long) node.get("managerId");
            if (managerId != null && nodeMap.containsKey(managerId)) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> children = (List<Map<String, Object>>) nodeMap.get(managerId).get("children");
                children.add(node);
            } else {
                roots.add(node);
            }
        }
        return ResponseEntity.ok(roots);
    }

    // ─── Bulk Archive ─────────────────────────────────────────────────────────

    @PostMapping("/bulk-archive")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Bulk archive (deactivate) employees by ID list")
    public ResponseEntity<Map<String, Object>> bulkArchive(@RequestBody List<Long> ids) {
        List<Employee> employees = employeeRepository.findAllById(ids);
        employees.forEach(e -> e.setActive(false));
        employeeRepository.saveAll(employees);
        return ResponseEntity.ok(Map.of("count", employees.size()));
    }

    // ─── Import ───────────────────────────────────────────────────────────────

    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Import employees from an Excel file")
    public ResponseEntity<Map<String, Object>> importEmployees(
            @RequestParam("file") MultipartFile file,
            @RequestParam Long companyId) throws IOException {
        com.example.demo.base.entity.Company company = companyRepository.getReferenceById(companyId);

        List<Employee> imported = new ArrayList<>();
        try (org.apache.poi.ss.usermodel.Workbook wb = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String firstName = getCellStr(row, 0);
                String email = getCellStr(row, 1);
                if (firstName == null || firstName.isBlank()) continue;
                Employee emp = new Employee();
                emp.setFirstName(firstName);
                emp.setEmail(email);
                emp.setCompany(company);
                imported.add(emp);
            }
        }
        employeeRepository.saveAll(imported);
        return ResponseEntity.ok(Map.of("count", imported.size()));
    }

    private String getCellStr(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            default -> null;
        };
    }

    // ─── Export ───────────────────────────────────────────────────────────────

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Export employees for a company as Excel")
    public void exportEmployees(@RequestParam Long companyId,
                                jakarta.servlet.http.HttpServletResponse response) throws IOException {
        List<Employee> employees = employeeRepository.findByCompanyId(companyId);
        response.setContentType("application/octet-stream");
        response.setHeader("Content-Disposition", "attachment; filename=employees_" + companyId + ".xlsx");

        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Employees");
            String[] headers = {"Name", "Email", "Department", "Job Position", "Active"};
            Row header = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                header.createCell(i).setCellValue(headers[i]);
            }
            int rowIdx = 1;
            for (Employee e : employees) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(
                        (e.getFirstName() != null ? e.getFirstName() : "") + " " +
                        (e.getLastName() != null ? e.getLastName() : ""));
                row.createCell(1).setCellValue(e.getEmail() != null ? e.getEmail() : "");
                row.createCell(2).setCellValue(e.getDepartment() != null ? e.getDepartment().getName() : "");
                row.createCell(3).setCellValue(e.getJobPosition() != null ? e.getJobPosition().getName() : "");
                row.createCell(4).setCellValue(e.isActive() ? "Yes" : "No");
            }
            wb.write(response.getOutputStream());
        }
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get employee dashboard stats for a company")
    public ResponseEntity<Map<String, Object>> dashboard(@RequestParam Long companyId) {
        List<Employee> all = employeeRepository.findByCompanyId(companyId);
        long total = all.size();
        long active = all.stream().filter(Employee::isActive).count();
        long inactive = total - active;

        Map<String, Long> deptBreakdownMap = all.stream()
                .filter(e -> e.getDepartment() != null)
                .collect(Collectors.groupingBy(
                        e -> e.getDepartment().getName(),
                        Collectors.counting()));

        List<Map<String, Object>> deptBreakdown = deptBreakdownMap.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("dept", entry.getKey());
                    m.put("count", entry.getValue());
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", total);
        result.put("active", active);
        result.put("inactive", inactive);
        result.put("departmentBreakdown", deptBreakdown);
        return ResponseEntity.ok(result);
    }
}
