package com.example.demo.employee.controller;

import com.example.demo.base.entity.Department;
import com.example.demo.base.entity.JobPosition;
import com.example.demo.base.entity.ShiftSchedule;
import com.example.demo.common.util.ScopeFilter;
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
import lombok.extern.slf4j.Slf4j;
import com.example.demo.payroll.entity.Contract;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.xssf.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.CellRangeAddressList;
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
import java.util.Set;

@Slf4j
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
    private final com.example.demo.attendance.repository.AttendanceRepository attendanceRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('employee:view')")
    @Operation(summary = "List all employees (company-scoped)")
    public ResponseEntity<Page<EmployeeResponse>> list(
            @RequestParam(required = false) Long filterByCompanyId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(employeeService.getAll(pageable, filterByCompanyId));
    }

    @GetMapping("/online-status")
    @PreAuthorize("hasAuthority('employee:view')")
    @Operation(summary = "Get online (currently clocked in) employee IDs. companyId optional — omit for global (super admin).")
    public ResponseEntity<Map<String, Object>> getOnlineStatus(@RequestParam(required = false) Long companyId) {
        Set<Long> onlineIds;
        if (companyId != null) {
            java.time.LocalDate today = java.time.LocalDate.now();
            onlineIds = attendanceRepository
                    .findByCompanyIdAndAttendanceDateAndCheckInIsNotNullAndCheckOutIsNull(companyId, today)
                    .stream()
                    .map(a -> a.getEmployee().getId())
                    .collect(Collectors.toSet());
        } else {
            onlineIds = globalEmployeeService.getOnlineEmployeeIdsAcrossOrgs();
        }
        Map<String, Object> onlineResp = new java.util.LinkedHashMap<>();
        onlineResp.put("onlineEmployeeIds", onlineIds);
        onlineResp.put("count", onlineIds.size());
        return ResponseEntity.ok(onlineResp);
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
        var spec = ScopeFilter.<Employee>byCompany();
        List<Long> accessibleIds = spec != null
                ? employeeRepository.findAll(spec).stream().map(Employee::getId).collect(Collectors.toList())
                : longIds;
        List<Long> filteredIds = longIds.stream().filter(accessibleIds::contains).collect(Collectors.toList());
        List<Employee> employees = employeeRepository.findAllById(filteredIds);
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
            node.put("photoPath", e.getPhotoPath());
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
        var spec = ScopeFilter.<Employee>byCompany();
        List<Long> accessibleIds = spec != null
                ? employeeRepository.findAll(spec).stream().map(Employee::getId).collect(Collectors.toList())
                : ids;
        List<Long> filteredIds = ids.stream().filter(accessibleIds::contains).collect(Collectors.toList());
        List<Employee> employees = employeeRepository.findAllById(filteredIds);
        employees.forEach(e -> e.setActive(false));
        employeeRepository.saveAll(employees);
        Map<String, Object> archiveResp = new java.util.LinkedHashMap<>();
        archiveResp.put("count", employees.size());
        return ResponseEntity.ok(archiveResp);
    }

    // ─── Import ───────────────────────────────────────────────────────────────

    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Import employees from an Excel file. Columns: firstName, lastName, email, phone, department, jobPosition, workType, shift, employeeType, dateJoining (yyyy-MM-dd)")
    public ResponseEntity<Map<String, Object>> importEmployees(
            @RequestParam("file") MultipartFile file,
            @RequestParam Long companyId) throws IOException {

        log.info("[importEmployees] companyId={} file={} size={}", companyId, file.getOriginalFilename(), file.getSize());

        var departments  = departmentRepository.findByCompanyId(companyId);
        var jobPositions = jobPositionRepository.findByCompanyId(companyId);
        var shifts       = shiftScheduleRepository.findByCompanyId(companyId);

        List<EmployeeRequest> requests = new ArrayList<>();
        try (Workbook wb = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            log.info("[importEmployees] sheet rows={}", sheet.getLastRowNum());
            for (int i = 2; i <= sheet.getLastRowNum(); i++) { // row 0=headers, row 1=hints, data starts at row 2
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String firstName = getCellStr(row, 0);
                if (firstName == null || firstName.isBlank()) continue;

                // Columns: 0=FirstName 1=LastName 2=Email 3=Phone 4=Gender
                //          5=Department 6=JobPosition 7=Shift 8=WageType 9=EmployeeType
                //          10=Location 11=DateJoining 12=BasicSalary 13=HousingAllowance
                //          14=TransportAllowance 15=OtherAllowance 16=TotalSalary
                //          17=SalaryPerHour(skip) 18=ContractEndDate
                EmployeeRequest req = new EmployeeRequest();
                req.setFirstName(firstName);
                req.setLastName(getCellStr(row, 1));
                req.setEmail(getCellStr(row, 2));
                String phone = getCellStr(row, 3);
                req.setPhone(phone);
                req.setPassword(phone);
                req.setCompanyId(companyId);

                String genderStr = getCellStr(row, 4);
                if (genderStr != null && !genderStr.isBlank()) {
                    try { req.setGender(Employee.Gender.valueOf(genderStr.trim().toUpperCase())); }
                    catch (IllegalArgumentException ignored) {}
                }

                String deptName = getCellStr(row, 5);
                if (deptName != null && !deptName.isBlank()) {
                    departments.stream().filter(d -> deptName.trim().equalsIgnoreCase(d.getName()))
                            .findFirst().ifPresent(d -> req.setDepartmentId(d.getId()));
                }

                String jobPosName = getCellStr(row, 6);
                if (jobPosName != null && !jobPosName.isBlank()) {
                    jobPositions.stream().filter(jp -> jobPosName.trim().equalsIgnoreCase(jp.getName()))
                            .findFirst().ifPresent(jp -> req.setJobPositionId(jp.getId()));
                }

                String shiftName = getCellStr(row, 7);
                if (shiftName != null && !shiftName.isBlank()) {
                    shifts.stream().filter(s -> shiftName.trim().equalsIgnoreCase(s.getName()))
                            .findFirst().ifPresent(s -> req.setShiftId(s.getId()));
                }

                String wageTypeStr = getCellStr(row, 8);
                if (wageTypeStr != null && !wageTypeStr.isBlank()) {
                    try { req.setWageType(Contract.WageType.valueOf(wageTypeStr.trim().toUpperCase())); }
                    catch (IllegalArgumentException ignored) {}
                }

                String empTypeStr = getCellStr(row, 9);
                if (empTypeStr != null && !empTypeStr.isBlank()) {
                    try { req.setEmployeeType(Employee.EmployeeType.valueOf(empTypeStr.trim().toUpperCase())); }
                    catch (IllegalArgumentException ignored) {}
                }

                req.setCity(getCellStr(row, 10));

                String dateJoiningStr = getCellStr(row, 11);
                if (dateJoiningStr != null && !dateJoiningStr.isBlank()) {
                    try { req.setDateJoining(LocalDate.parse(dateJoiningStr.trim())); } catch (Exception ignored) {}
                }

                req.setBasicPay(getCellDecimal(row, 12));
                req.setHousingAllowance(getCellDecimal(row, 13));
                req.setTransportAllowance(getCellDecimal(row, 14));
                req.setOtherAllowance(getCellDecimal(row, 15));
                req.setTotalSalary(getCellDecimal(row, 16));
                req.setSalaryPerHour(getCellDecimal(row, 17));

                String contractEndStr = getCellStr(row, 18);
                if (contractEndStr != null && !contractEndStr.isBlank()) {
                    try { req.setContractEndDate(LocalDate.parse(contractEndStr.trim())); } catch (Exception ignored) {}
                }

                log.info("[importEmployees] row {} → firstName={} lastName={} email={} companyId={}",
                        i + 1, req.getFirstName(), req.getLastName(), req.getEmail(), req.getCompanyId());
                requests.add(req);
            }
        }

        log.info("[importEmployees] parsed {} requests, calling bulkImport", requests.size());
        Map<String, Object> result = employeeService.bulkImport(requests);
        log.info("[importEmployees] result={}", result);
        return ResponseEntity.ok(result);
    }

    private void addNamedRange(XSSFWorkbook wb, String name, String formula) {
        Name namedRange = wb.createName();
        namedRange.setNameName(name);
        namedRange.setRefersToFormula(formula);
    }

    private void addDropdown(XSSFSheet sheet, DataValidationHelper dvHelper,
                              String namedRange, int col, int firstRow, int lastRow) {
        DataValidationConstraint constraint = dvHelper.createFormulaListConstraint(namedRange);
        CellRangeAddressList addressList = new CellRangeAddressList(firstRow, lastRow, col, col);
        DataValidation dv = dvHelper.createValidation(constraint, addressList);
        dv.setShowErrorBox(true);
        sheet.addValidationData(dv);
    }

    private void setBorders(XSSFCellStyle style, XSSFColor color) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(color);
        style.setBottomBorderColor(color);
        style.setLeftBorderColor(color);
        style.setRightBorderColor(color);
    }

    private String getCellStr(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toLocalDate().toString();
                }
                double v = cell.getNumericCellValue();
                yield (v == Math.floor(v)) ? String.valueOf((long) v) : String.valueOf(v);
            }
            default -> null;
        };
    }

    private java.math.BigDecimal getCellDecimal(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        try {
            return switch (cell.getCellType()) {
                case NUMERIC -> java.math.BigDecimal.valueOf(cell.getNumericCellValue());
                case STRING -> {
                    String s = cell.getStringCellValue().trim();
                    yield s.isBlank() ? null : new java.math.BigDecimal(s);
                }
                default -> null;
            };
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // ─── Import Template ──────────────────────────────────────────────────────

    @GetMapping("/import/template")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Operation(summary = "Download the Excel template for bulk employee import")
    public void downloadImportTemplate(@RequestParam(required = false) Long companyId,
                                       HttpServletResponse response) throws IOException {
        response.setContentType("application/octet-stream");
        response.setHeader("Content-Disposition", "attachment; filename=employee_import_template.xlsx");

        // Fetch dropdown options using ScopeFilter (same as list endpoints) so enterprise
        // admins get data from all their accessible companies (HEAD_OFFICE + branches).
        // Falls back to companyId param for platform admins without X-Company-Id context.
        var deptSpec  = ScopeFilter.<Department>byCompany();
        var posSpec   = ScopeFilter.<JobPosition>byCompany();
        var shiftSpec = ScopeFilter.<ShiftSchedule>byCompany();

        List<String> deptNames = (deptSpec != null
                ? departmentRepository.findAll(deptSpec)
                : companyId != null ? departmentRepository.findByCompanyId(companyId) : departmentRepository.findAll()
        ).stream().map(Department::getName).toList();

        List<String> posNames = (posSpec != null
                ? jobPositionRepository.findAll(posSpec)
                : companyId != null ? jobPositionRepository.findByCompanyId(companyId) : jobPositionRepository.findAll()
        ).stream().map(JobPosition::getName).toList();

        List<String> shiftNames = (shiftSpec != null
                ? shiftScheduleRepository.findAll(shiftSpec)
                : companyId != null ? shiftScheduleRepository.findByCompanyId(companyId) : shiftScheduleRepository.findAll()
        ).stream().map(ShiftSchedule::getName).toList();

        // Derive option lists from enums (no hardcoded values)
        List<String> empTypeOptions  = Arrays.stream(Employee.EmployeeType.values()).map(Enum::name).toList();
        List<String> genderOptions   = Arrays.stream(Employee.Gender.values()).map(Enum::name).toList();
        List<String> wageTypeOptions = Arrays.stream(Contract.WageType.values()).map(Enum::name).toList();

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet sheet = wb.createSheet("Employees");
            sheet.setDefaultRowHeightInPoints(18);

            // ── Theme colours ──────────────────────────────────────────
            // Primary: purple-600 #7C3AED
            XSSFColor indigo     = new XSSFColor(new byte[]{(byte)124, (byte)58,  (byte)237}, null);
            // Light bg: purple-50 #F5F3FF
            XSSFColor indigoLight= new XSSFColor(new byte[]{(byte)245,(byte)243,(byte)255}, null);
            // Hint row: slate-100 #F1F5F9
            XSSFColor slateLight = new XSSFColor(new byte[]{(byte)241,(byte)245,(byte)249}, null);
            // Border: gray-300 #D1D5DB
            XSSFColor borderGray = new XSSFColor(new byte[]{(byte)209,(byte)213,(byte)219}, null);

            // ── Reusable styles ────────────────────────────────────────
            // Header style
            XSSFCellStyle headerStyle = wb.createCellStyle();
            XSSFFont headerFont = wb.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 11);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(indigo);
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.MEDIUM);
            headerStyle.setBottomBorderColor(indigo);

            // Hint style (allowed values row)
            XSSFCellStyle hintStyle = wb.createCellStyle();
            XSSFFont hintFont = wb.createFont();
            hintFont.setItalic(true);
            hintFont.setFontHeightInPoints((short) 9);
            hintFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
            hintStyle.setFont(hintFont);
            hintStyle.setFillForegroundColor(slateLight);
            hintStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            hintStyle.setAlignment(HorizontalAlignment.CENTER);
            hintStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorders(hintStyle, borderGray);

            // Sample data style
            XSSFCellStyle sampleStyle = wb.createCellStyle();
            XSSFFont sampleFont = wb.createFont();
            sampleFont.setFontHeightInPoints((short) 10);
            sampleStyle.setFont(sampleFont);
            sampleStyle.setFillForegroundColor(indigoLight);
            sampleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            sampleStyle.setAlignment(HorizontalAlignment.LEFT);
            sampleStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorders(sampleStyle, borderGray);

            // Numeric sample style (right-aligned)
            XSSFCellStyle numStyle = wb.createCellStyle();
            numStyle.cloneStyleFrom(sampleStyle);
            numStyle.setAlignment(HorizontalAlignment.RIGHT);

            // ── Column definitions ─────────────────────────────────────
            // {header, hint, sample value, isNumeric, width (chars*256)}
            Object[][] cols = {
                {"First Name*",       "Text",                           "John",              false, 5500},
                {"Last Name",         "Text",                           "Doe",               false, 5000},
                {"Email*",            "Valid email address",            "john.doe@acme.com", false, 7500},
                {"Phone*",            "Digits only",                    "9876543210",        false, 5500},
                {"Gender",            "Select from dropdown",           "MALE",              false, 5500},
                {"Department",        "Select from dropdown",           "Engineering",       false, 7000},
                {"Job Position",      "Select from dropdown",           "Software Engineer", false, 7500},
                {"Shift",             "Select from dropdown",           "Morning Shift",     false, 6500},
                {"Wage Type",         "Select from dropdown",           "MONTHLY",           false, 5500},
                {"Employee Type",     "Select from dropdown",           "FULL_TIME",         false, 6500},
                {"Location",          "City / Office location",         "Dubai",             false, 5500},
                {"Date of Joining",   "yyyy-MM-dd",                     "2024-01-15",        false, 6500},
                {"Basic Salary",      "Number",                         5000.00,             true,  5500},
                {"Housing Allowance", "Number",                         1000.00,             true,  6500},
                {"Transport Allowance","Number",                        500.00,              true,  6500},
                {"Other Allowance",   "Number",                         200.00,              true,  5500},
                {"Total Salary",      "Number (sum of all components)", 6700.00,             true,  5500},
                {"Salary Per Hour",   "Number",                         25.00,               true,  6500},
                {"Contract End Date", "yyyy-MM-dd  (leave blank if permanent)", "2025-01-14", false, 7000},
            };

            // ── Row 0: Headers ─────────────────────────────────────────
            XSSFRow headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(24);
            for (int c = 0; c < cols.length; c++) {
                XSSFCell cell = headerRow.createCell(c);
                cell.setCellValue((String) cols[c][0]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(c, (int) cols[c][4]);
            }

            // ── Row 1: Hints ───────────────────────────────────────────
            XSSFRow hintRow = sheet.createRow(1);
            hintRow.setHeightInPoints(16);
            for (int c = 0; c < cols.length; c++) {
                XSSFCell cell = hintRow.createCell(c);
                cell.setCellValue((String) cols[c][1]);
                cell.setCellStyle(hintStyle);
            }

            // ── Row 2: Sample data ─────────────────────────────────────
            XSSFRow sampleRow = sheet.createRow(2);
            sampleRow.setHeightInPoints(18);
            for (int c = 0; c < cols.length; c++) {
                XSSFCell cell = sampleRow.createCell(c);
                Object sampleVal = cols[c][2];
                boolean isNumeric = (boolean) cols[c][3];
                if (isNumeric && sampleVal instanceof Number) {
                    cell.setCellValue(((Number) sampleVal).doubleValue());
                    cell.setCellStyle(numStyle);
                } else {
                    cell.setCellValue(sampleVal != null ? sampleVal.toString() : "");
                    cell.setCellStyle(sampleStyle);
                }
            }

            // Freeze header + hint rows
            sheet.createFreezePane(0, 2);

            // ── _Options sheet (hidden) — holds dropdown source data ───
            // Col A(0)=Dept  B(1)=Position  C(2)=Shift
            // D(3)=EmpType   E(4)=Gender    F(5)=WageType
            XSSFSheet optSheet = wb.createSheet("_Options");
            List<List<String>> optCols = List.of(
                    deptNames, posNames, shiftNames, empTypeOptions, genderOptions, wageTypeOptions
            );
            int maxOptRows = optCols.stream().mapToInt(List::size).max().orElse(0);
            for (int r = 0; r < maxOptRows; r++) {
                XSSFRow optRow = optSheet.createRow(r);
                for (int c = 0; c < optCols.size(); c++) {
                    List<String> opts = optCols.get(c);
                    if (r < opts.size()) {
                        optRow.createCell(c).setCellValue(opts.get(r));
                    }
                }
            }

            // Named ranges pointing to _Options columns
            if (!deptNames.isEmpty())
                addNamedRange(wb, "DeptList",     "_Options!$A$1:$A$" + deptNames.size());
            if (!posNames.isEmpty())
                addNamedRange(wb, "PositionList", "_Options!$B$1:$B$" + posNames.size());
            if (!shiftNames.isEmpty())
                addNamedRange(wb, "ShiftList",    "_Options!$C$1:$C$" + shiftNames.size());
            addNamedRange(wb, "EmpTypeList",  "_Options!$D$1:$D$" + empTypeOptions.size());
            addNamedRange(wb, "GenderList",   "_Options!$E$1:$E$" + genderOptions.size());
            addNamedRange(wb, "WageTypeList", "_Options!$F$1:$F$" + wageTypeOptions.size());

            // Data validations on data rows (row index 2–1000)
            DataValidationHelper dvh = sheet.getDataValidationHelper();
            addDropdown(sheet, dvh, "GenderList",   4, 2, 1000);
            if (!deptNames.isEmpty())
                addDropdown(sheet, dvh, "DeptList",     5, 2, 1000);
            if (!posNames.isEmpty())
                addDropdown(sheet, dvh, "PositionList", 6, 2, 1000);
            if (!shiftNames.isEmpty())
                addDropdown(sheet, dvh, "ShiftList",    7, 2, 1000);
            addDropdown(sheet, dvh, "WageTypeList", 8, 2, 1000);
            addDropdown(sheet, dvh, "EmpTypeList",  9, 2, 1000);

            // Hide the options sheet
            wb.setSheetHidden(wb.getSheetIndex("_Options"), true);

            wb.write(response.getOutputStream());
        }
    }

    // ─── Export ───────────────────────────────────────────────────────────────

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Export employees for a company as Excel")
    public void exportEmployees(@RequestParam Long companyId,
                                jakarta.servlet.http.HttpServletResponse response) throws IOException {
        // Resolve company name for use in export
        String companyDisplayName = companyRepository.findById(companyId)
                .map(c -> c.getName())
                .orElse("Unknown Company");

        // Use scope-aware spec so enterprise admins get all accessible employees
        var spec = com.example.demo.common.util.ScopeFilter.<Employee>byCompany();
        List<Employee> employees = spec != null
                ? employeeRepository.findAll(spec)
                : employeeRepository.findByCompanyId(companyId);

        // Pre-fetch work info for all employees (keyed by employee ID)
        Map<Long, com.example.demo.employee.entity.EmployeeWorkInformation> workInfoMap = new java.util.HashMap<>();
        for (Employee e : employees) {
            if (e.getId() != null) {
                employeeWorkInformationRepository.findByEmployeeId(e.getId())
                        .ifPresent(wi -> workInfoMap.put(e.getId(), wi));
            }
        }

        response.setContentType("application/octet-stream");
        response.setHeader("Content-Disposition",
                "attachment; filename=employees_" + companyDisplayName.replaceAll("[^a-zA-Z0-9_-]", "_") + ".xlsx");

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet sheet = wb.createSheet("Employees");
            sheet.setDefaultRowHeightInPoints(18);

            // Purple theme
            XSSFColor purple      = new XSSFColor(new byte[]{(byte)124, (byte)58,  (byte)237}, null);
            XSSFColor purpleLight = new XSSFColor(new byte[]{(byte)245,(byte)243,(byte)255}, null);
            XSSFColor borderGray  = new XSSFColor(new byte[]{(byte)209,(byte)213,(byte)219}, null);

            // Header cell style
            XSSFCellStyle headerStyle = wb.createCellStyle();
            XSSFFont headerFont = wb.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 11);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(purple);
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.MEDIUM);
            headerStyle.setBottomBorderColor(purple);

            // Data cell style
            XSSFCellStyle dataStyle = wb.createCellStyle();
            XSSFFont dataFont = wb.createFont();
            dataFont.setFontHeightInPoints((short) 10);
            dataStyle.setFont(dataFont);
            dataStyle.setFillForegroundColor(purpleLight);
            dataStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            dataStyle.setAlignment(HorizontalAlignment.LEFT);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorders(dataStyle, borderGray);

            // Alternating white row style
            XSSFCellStyle altStyle = wb.createCellStyle();
            altStyle.cloneStyleFrom(dataStyle);
            altStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)255,(byte)255,(byte)255}, null));
            altStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String[] headers = {
                "ID", "First Name", "Last Name", "Email", "Phone", "Gender",
                "Department", "Job Position", "Job Role", "Shift", "Work Type",
                "Reporting Manager", "Employee Type", "Location", "Date of Joining",
                "Basic Salary", "Housing Allowance", "Transport Allowance", "Other Allowance",
                "Total Salary", "Salary Per Hour", "Contract End Date", "Company"
            };
            int[] colWidths = {
                3500, 5000, 5000, 7500, 5500, 4500,
                6500, 7000, 6500, 6000, 6000,
                7000, 6000, 6000, 6000,
                6000, 7000, 7500, 6500,
                6000, 6500, 6500, 7000
            };

            // Header row
            XSSFRow headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(24);
            for (int i = 0; i < headers.length; i++) {
                XSSFCell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, colWidths[i]);
            }

            // Data rows
            int rowIdx = 1;
            for (Employee e : employees) {
                XSSFRow row = sheet.createRow(rowIdx);
                XSSFCellStyle rowStyle = (rowIdx % 2 == 0) ? altStyle : dataStyle;
                row.setHeightInPoints(18);

                com.example.demo.employee.entity.EmployeeWorkInformation wi =
                        e.getId() != null ? workInfoMap.get(e.getId()) : null;

                // Salary fields (default to ZERO if null)
                java.math.BigDecimal basic     = wi != null && wi.getBasicSalary()         != null ? wi.getBasicSalary()         : java.math.BigDecimal.ZERO;
                java.math.BigDecimal housing   = wi != null && wi.getHousingAllowance()    != null ? wi.getHousingAllowance()    : java.math.BigDecimal.ZERO;
                java.math.BigDecimal transport = wi != null && wi.getTransportAllowance()  != null ? wi.getTransportAllowance()  : java.math.BigDecimal.ZERO;
                java.math.BigDecimal other     = wi != null && wi.getOtherAllowance()      != null ? wi.getOtherAllowance()      : java.math.BigDecimal.ZERO;
                java.math.BigDecimal total     = basic.add(housing).add(transport).add(other);

                String reportingMgr = "";
                if (e.getReportingManager() != null) {
                    String fn = e.getReportingManager().getFirstName() != null ? e.getReportingManager().getFirstName() : "";
                    String ln = e.getReportingManager().getLastName()  != null ? e.getReportingManager().getLastName()  : "";
                    reportingMgr = (fn + " " + ln).trim();
                }

                String empCompanyName = e.getCompany() != null ? e.getCompany().getName() : companyDisplayName;

                createStyledCell(row,  0, e.getId()                    != null ? String.valueOf(e.getId())                      : "", rowStyle);
                createStyledCell(row,  1, e.getFirstName()             != null ? e.getFirstName()                               : "", rowStyle);
                createStyledCell(row,  2, e.getLastName()              != null ? e.getLastName()                                : "", rowStyle);
                createStyledCell(row,  3, e.getEmail()                 != null ? e.getEmail()                                   : "", rowStyle);
                createStyledCell(row,  4, e.getPhone()                 != null ? e.getPhone()                                   : "", rowStyle);
                createStyledCell(row,  5, e.getGender()                != null ? e.getGender().name()                          : "", rowStyle);
                createStyledCell(row,  6, e.getDepartment()            != null ? e.getDepartment().getName()                   : "", rowStyle);
                createStyledCell(row,  7, e.getJobPosition()           != null ? e.getJobPosition().getName()                  : "", rowStyle);
                createStyledCell(row,  8, e.getJobRole()               != null ? e.getJobRole().getName()                      : "", rowStyle);
                createStyledCell(row,  9, e.getShift()                 != null ? e.getShift().getName()                        : "", rowStyle);
                createStyledCell(row, 10, e.getWorkType()              != null ? e.getWorkType().getName()                     : "", rowStyle);
                createStyledCell(row, 11, reportingMgr,                                                                              rowStyle);
                createStyledCell(row, 12, e.getEmployeeType()          != null ? e.getEmployeeType().name()                    : "", rowStyle);
                createStyledCell(row, 13, wi != null && wi.getLocation()         != null ? wi.getLocation()                    : "", rowStyle);
                createStyledCell(row, 14, e.getDateJoining()           != null ? e.getDateJoining().toString()                 : "", rowStyle);
                createStyledCell(row, 15, basic.compareTo(java.math.BigDecimal.ZERO)     != 0 ? basic.toPlainString()          : "", rowStyle);
                createStyledCell(row, 16, housing.compareTo(java.math.BigDecimal.ZERO)   != 0 ? housing.toPlainString()        : "", rowStyle);
                createStyledCell(row, 17, transport.compareTo(java.math.BigDecimal.ZERO) != 0 ? transport.toPlainString()      : "", rowStyle);
                createStyledCell(row, 18, other.compareTo(java.math.BigDecimal.ZERO)     != 0 ? other.toPlainString()          : "", rowStyle);
                createStyledCell(row, 19, total.compareTo(java.math.BigDecimal.ZERO)     != 0 ? total.toPlainString()          : "", rowStyle);
                createStyledCell(row, 20, wi != null && wi.getSalaryHour()       != null ? String.valueOf(wi.getSalaryHour())  : "", rowStyle);
                createStyledCell(row, 21, wi != null && wi.getContractEndDate()  != null ? wi.getContractEndDate().toString()  : "", rowStyle);
                createStyledCell(row, 22, empCompanyName,                                                                             rowStyle);
                rowIdx++;
            }

            sheet.createFreezePane(0, 1);
            wb.write(response.getOutputStream());
        }
    }

    private void createStyledCell(XSSFRow row, int col, String value, XSSFCellStyle style) {
        XSSFCell cell = row.createCell(col);
        cell.setCellValue(value);
        cell.setCellStyle(style);
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

        var departments = departmentRepository.findByCompanyId(companyId);
        var jobPositions = jobPositionRepository.findByCompanyId(companyId);
        var shifts = shiftScheduleRepository.findByCompanyId(companyId);
        var workTypes = workTypeRepository.findByCompanyId(companyId);

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
                    departments.stream()
                            .filter(d -> deptName.trim().equalsIgnoreCase(d.getName()))
                            .findFirst()
                            .ifPresent(wi::setDepartment);
                }

                String jobPosName = getCellStr(row, 2);
                if (jobPosName != null && !jobPosName.isBlank()) {
                    jobPositions.stream()
                            .filter(jp -> jobPosName.trim().equalsIgnoreCase(jp.getName()))
                            .findFirst()
                            .ifPresent(wi::setJobPosition);
                }

                String shiftName = getCellStr(row, 3);
                if (shiftName != null && !shiftName.isBlank()) {
                    shifts.stream()
                            .filter(s -> shiftName.trim().equalsIgnoreCase(s.getName()))
                            .findFirst()
                            .ifPresent(wi::setShift);
                }

                String workTypeName = getCellStr(row, 4);
                if (workTypeName != null && !workTypeName.isBlank()) {
                    workTypes.stream()
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

    record BulkUpdateRequest(List<Long> employeeIds, Long departmentId, Long shiftId, Long workTypeId, Long jobPositionId) {}

    @PostMapping("/bulk-update")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER')")
    @Transactional
    @Operation(summary = "Bulk update work info fields for a list of employees")
    public ResponseEntity<Map<String, Object>> bulkUpdateWorkInfo(@RequestBody BulkUpdateRequest request) {
        if (request.employeeIds() == null || request.employeeIds().isEmpty()) {
            Map<String, Object> errResp = new java.util.LinkedHashMap<>();
            errResp.put("message", "employeeIds is required");
            return ResponseEntity.badRequest().body(errResp);
        }

        final com.example.demo.base.entity.Department finalDept = request.departmentId() != null
                ? departmentRepository.findById(request.departmentId()).orElse(null) : null;

        final com.example.demo.base.entity.ShiftSchedule finalShift = request.shiftId() != null
                ? shiftScheduleRepository.findById(request.shiftId()).orElse(null) : null;

        final com.example.demo.base.entity.WorkType finalWorkType = request.workTypeId() != null
                ? workTypeRepository.findById(request.workTypeId()).orElse(null) : null;

        final com.example.demo.base.entity.JobPosition finalJobPosition = request.jobPositionId() != null
                ? jobPositionRepository.findById(request.jobPositionId()).orElse(null) : null;

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

        Map<String, Object> updateResp = new java.util.LinkedHashMap<>();
        updateResp.put("updated", updatedCount);
        return ResponseEntity.ok(updateResp);
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('employee:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get employee dashboard stats for a company")
    public ResponseEntity<Map<String, Object>> dashboard(@RequestParam Long companyId) {
        // Use scope-aware spec so enterprise admins see all accessible employees (HO + branches)
        var spec = ScopeFilter.<Employee>byCompany();
        List<Employee> all = spec != null
                ? employeeRepository.findAll(spec)
                : employeeRepository.findByCompanyId(companyId);
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
