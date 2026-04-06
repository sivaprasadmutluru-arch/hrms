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

    // ─── Work Info Export ─────────────────────────────────────────────────────

    @GetMapping("/work-info/export")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional(readOnly = true)
    @Operation(summary = "Export work information for all employees of a company as Excel")
    public void exportWorkInfo(@RequestParam Long companyId,
                               HttpServletResponse response) throws IOException {
        List<Employee> employees = employeeRepository.findByCompanyId(companyId);
        response.setContentType("application/octet-stream");
        response.setHeader("Content-Disposition", "attachment; filename=work_info_" + companyId + ".xlsx");

        try (org.apache.poi.xssf.usermodel.XSSFWorkbook wb = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.xssf.usermodel.XSSFSheet sheet = wb.createSheet("Work Info");
            String[] headers = {
                "Employee ID", "Employee Name", "Department", "Job Position",
                "Job Role", "Work Type", "Shift Schedule", "Reporting Manager", "Date of Joining"
            };
            org.apache.poi.xssf.usermodel.XSSFRow headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }
            int rowIdx = 1;
            for (Employee emp : employees) {
                EmployeeWorkInformation wi = employeeWorkInformationRepository
                        .findByEmployeeId(emp.getId()).orElse(null);
                org.apache.poi.xssf.usermodel.XSSFRow row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(emp.getId() != null ? emp.getId() : 0L);
                row.createCell(1).setCellValue(
                        (emp.getFirstName() != null ? emp.getFirstName() : "") + " " +
                        (emp.getLastName() != null ? emp.getLastName() : ""));
                row.createCell(2).setCellValue(wi != null && wi.getDepartment() != null ? wi.getDepartment().getName() : "");
                row.createCell(3).setCellValue(wi != null && wi.getJobPosition() != null ? wi.getJobPosition().getName() : "");
                row.createCell(4).setCellValue(wi != null && wi.getJobRole() != null ? wi.getJobRole().getName() : "");
                row.createCell(5).setCellValue(wi != null && wi.getWorkType() != null ? wi.getWorkType().getName() : "");
                row.createCell(6).setCellValue(wi != null && wi.getShift() != null ? wi.getShift().getName() : "");
                Employee mgr = wi != null ? wi.getReportingManager() : null;
                row.createCell(7).setCellValue(mgr != null ?
                        (mgr.getFirstName() != null ? mgr.getFirstName() : "") + " " +
                        (mgr.getLastName() != null ? mgr.getLastName() : "") : "");
                row.createCell(8).setCellValue(wi != null && wi.getDateJoining() != null ? wi.getDateJoining().toString() : "");
            }
            wb.write(response.getOutputStream());
        }
    }

    // ─── Work Info Import ─────────────────────────────────────────────────────

    @PostMapping("/work-info/import")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Import work information for employees from an Excel file")
    public ResponseEntity<Map<String, Object>> importWorkInfo(
            @RequestParam("file") MultipartFile file,
            @RequestParam Long companyId) throws IOException {

        int updated = 0;
        List<String> errors = new ArrayList<>();

        try (org.apache.poi.ss.usermodel.Workbook wb = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String empIdStr = getCellStr(row, 0);
                if (empIdStr == null || empIdStr.isBlank()) continue;

                Long empId;
                try {
                    empId = Long.parseLong(empIdStr.trim());
                } catch (NumberFormatException ex) {
                    errors.add("Row " + (i + 1) + ": invalid Employee ID '" + empIdStr + "'");
                    continue;
                }

                Employee emp = employeeRepository.findById(empId).orElse(null);
                if (emp == null) {
                    errors.add("Row " + (i + 1) + ": employee not found for ID " + empId);
                    continue;
                }

                EmployeeWorkInformation wi = employeeWorkInformationRepository
                        .findByEmployeeId(empId)
                        .orElseGet(() -> {
                            EmployeeWorkInformation n = new EmployeeWorkInformation();
                            n.setEmployee(emp);
                            return n;
                        });

                String deptName = getCellStr(row, 1);
                if (deptName != null && !deptName.isBlank()) {
                    departmentRepository.findAll().stream()
                            .filter(d -> deptName.trim().equalsIgnoreCase(d.getName()))
                            .findFirst()
                            .ifPresent(wi::setDepartment);
                }

                String jobPosName = getCellStr(row, 2);
                if (jobPosName != null && !jobPosName.isBlank()) {
                    jobPositionRepository.findAll().stream()
                            .filter(jp -> jobPosName.trim().equalsIgnoreCase(jp.getName()))
                            .findFirst()
                            .ifPresent(wi::setJobPosition);
                }

                String shiftName = getCellStr(row, 3);
                if (shiftName != null && !shiftName.isBlank()) {
                    shiftScheduleRepository.findAll().stream()
                            .filter(s -> shiftName.trim().equalsIgnoreCase(s.getName()))
                            .findFirst()
                            .ifPresent(wi::setShift);
                }

                String workTypeName = getCellStr(row, 4);
                if (workTypeName != null && !workTypeName.isBlank()) {
                    workTypeRepository.findAll().stream()
                            .filter(wt -> workTypeName.trim().equalsIgnoreCase(wt.getName()))
                            .findFirst()
                            .ifPresent(wi::setWorkType);
                }

                String mgrIdStr = getCellStr(row, 5);
                if (mgrIdStr != null && !mgrIdStr.isBlank()) {
                    try {
                        Long mgrId = Long.parseLong(mgrIdStr.trim());
                        employeeRepository.findById(mgrId).ifPresent(wi::setReportingManager);
                    } catch (NumberFormatException ex) {
                        errors.add("Row " + (i + 1) + ": invalid Reporting Manager ID '" + mgrIdStr + "'");
                    }
                }

                employeeWorkInformationRepository.save(wi);
                updated++;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("updated", updated);
        result.put("errors", errors);
        return ResponseEntity.ok(result);
    }

    // ─── Bulk Field Update ────────────────────────────────────────────────────

    record BulkUpdateRequest(List<Long> employeeIds, String department, String shift, String workType, String jobPosition) {}

    @PostMapping("/bulk-update")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Bulk update work info fields for a list of employees")
    public ResponseEntity<Map<String, Object>> bulkUpdateWorkInfo(@RequestBody BulkUpdateRequest request) {
        if (request.employeeIds() == null || request.employeeIds().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "employeeIds is required"));
        }

        com.example.demo.base.entity.Department resolvedDept = null;
        if (request.department() != null && !request.department().isBlank()) {
            resolvedDept = departmentRepository.findAll().stream()
                    .filter(d -> request.department().trim().equalsIgnoreCase(d.getName()))
                    .findFirst().orElse(null);
        }

        com.example.demo.base.entity.ShiftSchedule resolvedShift = null;
        if (request.shift() != null && !request.shift().isBlank()) {
            resolvedShift = shiftScheduleRepository.findAll().stream()
                    .filter(s -> request.shift().trim().equalsIgnoreCase(s.getName()))
                    .findFirst().orElse(null);
        }

        com.example.demo.base.entity.WorkType resolvedWorkType = null;
        if (request.workType() != null && !request.workType().isBlank()) {
            resolvedWorkType = workTypeRepository.findAll().stream()
                    .filter(wt -> request.workType().trim().equalsIgnoreCase(wt.getName()))
                    .findFirst().orElse(null);
        }

        com.example.demo.base.entity.JobPosition resolvedJobPosition = null;
        if (request.jobPosition() != null && !request.jobPosition().isBlank()) {
            resolvedJobPosition = jobPositionRepository.findAll().stream()
                    .filter(jp -> request.jobPosition().trim().equalsIgnoreCase(jp.getName()))
                    .findFirst().orElse(null);
        }

        final com.example.demo.base.entity.Department finalDept = resolvedDept;
        final com.example.demo.base.entity.ShiftSchedule finalShift = resolvedShift;
        final com.example.demo.base.entity.WorkType finalWorkType = resolvedWorkType;
        final com.example.demo.base.entity.JobPosition finalJobPosition = resolvedJobPosition;

        int updatedCount = 0;
        for (Long empId : request.employeeIds()) {
            Employee emp = employeeRepository.findById(empId).orElse(null);
            if (emp == null) continue;

            EmployeeWorkInformation wi = employeeWorkInformationRepository
                    .findByEmployeeId(empId)
                    .orElseGet(() -> {
                        EmployeeWorkInformation n = new EmployeeWorkInformation();
                        n.setEmployee(emp);
                        return n;
                    });

            if (finalDept != null) wi.setDepartment(finalDept);
            if (finalShift != null) wi.setShift(finalShift);
            if (finalWorkType != null) wi.setWorkType(finalWorkType);
            if (finalJobPosition != null) wi.setJobPosition(finalJobPosition);

            employeeWorkInformationRepository.save(wi);
            updatedCount++;
        }

        return ResponseEntity.ok(Map.of("updated", updatedCount));
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
