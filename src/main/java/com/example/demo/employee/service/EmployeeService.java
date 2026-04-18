package com.example.demo.employee.service;

import com.example.demo.auth.dto.AssignRoleRequest;
import com.example.demo.auth.dto.RegisterRequest;
import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.auth.service.AuthService;
import com.example.demo.auth.service.UserRoleService;
import com.example.demo.base.entity.*;
import com.example.demo.base.repository.*;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.service.FileUploadService;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.dto.EmployeeRequest;
import com.example.demo.employee.dto.EmployeeResponse;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.entity.EmployeeWorkInformation;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.employee.repository.EmployeeWorkInformationRepository;
import com.example.demo.payroll.entity.Contract;
import com.example.demo.payroll.repository.ContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeService {

    // Self-reference through Spring proxy so @Transactional works on internal calls (bulkImport → create)
    @Lazy
    @Autowired
    private EmployeeService self;

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final UserRoleService userRoleService;
    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;
    private final JobRoleRepository jobRoleRepository;
    private final WorkTypeRepository workTypeRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;
    private final ContractRepository contractRepository;
    private final FileUploadService fileUploadService;
    private final EmployeeWorkInformationRepository workInfoRepository;

    /**
     * Lists employees visible to the current user based on their access scope.
     *   SELF scope        → only the employee record linked to the current user
     *   DEPARTMENT scope  → only employees in the user's department
     *   BRANCH scope      → all employees in the branch
     *   ENTERPRISE scope  → all employees across HO + all branches
     */
    @Transactional(readOnly = true)
    public Page<EmployeeResponse> getAll(Pageable pageable) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();

        // SELF scope: return only the employee record linked to the current user
        if (scope != null && scope.isSelfScope()) {
            return employeeRepository.findByUserId(scope.getUserId())
                    .map(e -> {
                        Contract contract = contractRepository.findByEmployeeId(e.getId())
                                .stream().findFirst().orElse(null);
                        return (Page<EmployeeResponse>) new PageImpl<>(
                                Collections.singletonList(EmployeeResponse.from(e, contract)), pageable, 1);
                    })
                    .orElse(Page.empty(pageable));
        }

        // DEPARTMENT scope: only employees in the user's department
        // Other scopes: company-level filter
        Specification<Employee> spec = ScopeFilter.byDepartmentOrCompany();
        Page<Employee> page = spec != null
                ? employeeRepository.findAll(spec, pageable)
                : employeeRepository.findAll(pageable);

        // Fetch contracts for all employees in this page in one query to avoid N+1
        List<Long> employeeIds = page.getContent().stream().map(Employee::getId).collect(Collectors.toList());
        Map<Long, Contract> contractByEmployeeId = contractRepository.findByEmployeeIdIn(employeeIds)
                .stream().collect(Collectors.toMap(c -> c.getEmployee().getId(), c -> c, (a, b) -> a));

        return page.map(e -> EmployeeResponse.from(e, contractByEmployeeId.get(e.getId())));
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getById(Long id) {
        Employee emp = findEmployee(id);
        Contract contract = contractRepository.findByEmployeeId(id).stream().findFirst().orElse(null);
        return EmployeeResponse.from(emp, contract);
    }

    /**
     * Public entry point — intentionally NOT transactional.
     *
     * Problem: @Transactional(REQUIRES_NEW) acquires a DB connection (and runs
     * SET search_path) the moment Spring's proxy intercepts the call — BEFORE the
     * method body runs.  If TenantContext is still "public" at that instant (which
     * happens when PLATFORM_SUPER_ADMIN requests omit the X-Company-Id header),
     * the entire transaction runs against the public schema no matter what the
     * method body does later to TenantContext.
     *
     * Fix: set TenantContext here (no transaction yet, so no connection acquired)
     * and then call self.doCreate() through the proxy so REQUIRES_NEW starts with
     * the correct search_path already in place.
     */
    public EmployeeResponse create(EmployeeRequest req) {
        if (TenantContext.DEFAULT_TENANT.equals(TenantContext.getTenant())) {
            Company company = companyRepository.findById(req.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Company", req.getCompanyId()));
            String schema = company.isHeadOffice()
                    ? company.getSchemaName()
                    : (company.getParentCompanyId() != null
                        ? companyRepository.findById(company.getParentCompanyId())
                              .map(Company::getSchemaName).orElse(null)
                        : null);
            if (schema != null && !schema.isBlank()) {
                log.info("[create] TenantContext was at default — setting schema='{}' from companyId={}", schema, req.getCompanyId());
                TenantContext.setTenant(schema);
            }
        }
        return self.doCreate(req);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public EmployeeResponse doCreate(EmployeeRequest req) {
        log.info("[create] email={} companyId={}", req.getEmail(), req.getCompanyId());
        if (req.getEmail() != null && employeeRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new BadRequestException("Employee with this email already exists");
        }

        // Check subscription plan employee limit before creating
        Company company = companyRepository.findById(req.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", req.getCompanyId()));

        Organization org = company.getOrganization();
        if (org != null && org.getSubscriptionPlan() != null) {
            int planMaxEmployees = org.getSubscriptionPlan().getMaxEmployees();
            if (planMaxEmployees != Integer.MAX_VALUE) {
                List<Company> orgCompanies = companyRepository.findByOrganizationId(org.getId());
                long currentCount = orgCompanies.stream()
                        .mapToLong(c -> employeeRepository.findByCompanyIdAndIsActiveTrue(c.getId()).size())
                        .sum();
                if (currentCount >= planMaxEmployees) {
                    throw new BadRequestException(
                            "Employee limit of " + planMaxEmployees + " reached for subscription plan '"
                            + org.getSubscriptionPlan().name() + "'. Upgrade your plan to add more employees.");
                }
            }
        }

        Employee emp = buildEmployee(new Employee(), req);
        if (emp.getBadgeId() == null || emp.getBadgeId().isBlank()) {
            emp.setBadgeId(generateBadgeId(company.getId(), company.getName()));
        }

        // Auto-create a linked user account if email is provided
        if (req.getEmail() != null && !req.getEmail().isBlank()) {
            boolean[] isNewUser = {false};
            log.info("[create] looking up user by email={}", req.getEmail());
            User user = userRepository.findByEmail(req.getEmail()).orElseGet(() -> {
                isNewUser[0] = true;
                log.info("[create] user not found, registering new user for email={}", req.getEmail());
                RegisterRequest reg = new RegisterRequest();
                reg.setUsername(req.getEmail());
                reg.setEmail(req.getEmail());
                reg.setPassword(req.getPassword() != null && !req.getPassword().isBlank()
                        ? req.getPassword()
                        : (req.getPhone() != null && !req.getPhone().isBlank() ? req.getPhone() : "hrms@1234"));
                reg.setFirstName(req.getFirstName());
                reg.setLastName(req.getLastName());
                reg.setCompanyId(null); // role assignment handled explicitly below
                return authService.register(reg);
            });
            emp.setUser(user);

            // Assign role: use selected role, or default to EMPLOYEE+SELF for new users
            Role.RoleName roleName = req.getRole() != null ? req.getRole() : (isNewUser[0] ? Role.RoleName.EMPLOYEE : null);
            UserRole.AccessScope scope = req.getAccessScope() != null ? req.getAccessScope() : (isNewUser[0] ? UserRole.AccessScope.SELF : null);
            log.info("[create] isNewUser={} roleName={} scope={} userId={} companyId={}", isNewUser[0], roleName, scope, user.getId(), req.getCompanyId());
            if (roleName != null && scope != null && !userRoleService.hasRole(user.getId(), req.getCompanyId(), roleName)) {
                log.info("[create] assigning role={} to userId={}", roleName, user.getId());
                AssignRoleRequest roleReq = new AssignRoleRequest();
                roleReq.setUserId(user.getId());
                roleReq.setRoleName(roleName);
                roleReq.setCompanyId(req.getCompanyId());
                roleReq.setAccessScope(scope);
                userRoleService.assignRole(roleReq);
            }
        }

        log.info("[create] saving employee firstName={} companyId={}", emp.getFirstName(), req.getCompanyId());
        Employee saved = employeeRepository.save(emp);
        log.info("[create] saved employee id={}, creating contract & workInfo", saved.getId());
        Contract contract = createDefaultContract(saved, req);
        createDefaultWorkInfo(saved);
        log.info("[create] done for employee id={}", saved.getId());
        return EmployeeResponse.from(saved, contract);
    }

    public Map<String, Object> bulkImport(List<EmployeeRequest> requests) {
        int success = 0;
        List<Map<String, String>> failures = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            EmployeeRequest req = requests.get(i);
            try {
                log.info("[bulkImport] row {} — creating employee: firstName={} email={} companyId={}",
                        i + 2, req.getFirstName(), req.getEmail(), req.getCompanyId());
                self.create(req);
                success++;
                log.info("[bulkImport] row {} — success", i + 2);
            } catch (Exception e) {
                log.warn("[bulkImport] row {} — FAILED: {}", i + 2, e.getMessage(), e);
                Map<String, String> err = new LinkedHashMap<>();
                err.put("row", String.valueOf(i + 2)); // +2: 1-indexed + header row
                err.put("email", req.getEmail() != null ? req.getEmail() : "");
                err.put("reason", e.getMessage());
                failures.add(err);
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRows", requests.size());
        result.put("successCount", success);
        result.put("failureCount", failures.size());
        result.put("failures", failures);
        return result;
    }

    private Contract createDefaultContract(Employee emp, EmployeeRequest req) {
        Contract contract = new Contract();
        contract.setEmployee(emp);
        contract.setCompany(emp.getCompany());
        contract.setContractName("Contract - " + emp.getFirstName()
                + (emp.getLastName() != null ? " " + emp.getLastName() : ""));
        contract.setWage(req.getBasicPay());
        contract.setHousingAllowance(req.getHousingAllowance());
        contract.setTransportAllowance(req.getTransportAllowance());
        contract.setOtherAllowance(req.getOtherAllowance());
        contract.setTotalSalary(req.getTotalSalary());
        contract.setSalaryPerHour(req.getSalaryPerHour());
        contract.setWageType(req.getWageType() != null ? req.getWageType() : Contract.WageType.MONTHLY);
        contract.setPayFrequency(Contract.PayFrequency.MONTHLY);
        contract.setContractStatus(Contract.ContractStatus.DRAFT);
        contract.setStartDate(emp.getDateJoining());
        contract.setEndDate(req.getContractEndDate());
        contract.setDepartment(emp.getDepartment());
        contract.setJobPosition(emp.getJobPosition());
        contract.setJobRole(emp.getJobRole());
        contract.setWorkType(emp.getWorkType());
        return contractRepository.save(contract);
    }

    private void createDefaultWorkInfo(Employee emp) {
        EmployeeWorkInformation wi = new EmployeeWorkInformation();
        wi.setEmployee(emp);
        wi.setCompany(emp.getCompany());
        wi.setDepartment(emp.getDepartment());
        wi.setJobPosition(emp.getJobPosition());
        wi.setJobRole(emp.getJobRole());
        wi.setWorkType(emp.getWorkType());
        wi.setShift(emp.getShift());
        wi.setReportingManager(emp.getReportingManager());
        wi.setDateJoining(emp.getDateJoining());
        wi.setWorkEmail(emp.getWorkEmail());
        wi.setWorkMobile(emp.getWorkPhone());
        workInfoRepository.save(wi);
    }

    @Transactional
    public EmployeeResponse update(Long id, EmployeeRequest req) {
        Employee emp = findEmployee(id);
        buildEmployee(emp, req);
        // Link to user account if not already linked and email is provided
        if (emp.getUser() == null && req.getEmail() != null && !req.getEmail().isBlank()) {
            userRepository.findByEmail(req.getEmail()).ifPresent(emp::setUser);
        }
        Employee saved = employeeRepository.save(emp);

        // Sync work information record so the work-info tab stays consistent
        workInfoRepository.findByEmployeeId(id).ifPresent(wi -> {
            wi.setDepartment(saved.getDepartment());
            wi.setJobPosition(saved.getJobPosition());
            wi.setJobRole(saved.getJobRole());
            wi.setWorkType(saved.getWorkType());
            wi.setShift(saved.getShift());
            wi.setReportingManager(saved.getReportingManager());
            wi.setDateJoining(saved.getDateJoining());
            wi.setWorkEmail(saved.getWorkEmail());
            wi.setWorkMobile(saved.getWorkPhone());
            workInfoRepository.save(wi);
        });

        Contract contract = contractRepository.findByEmployeeId(saved.getId()).stream().findFirst().orElse(null);
        return EmployeeResponse.from(saved, contract);
    }

    @Transactional
    public void delete(Long id) {
        Employee emp = findEmployee(id);
        emp.setActive(false);
        employeeRepository.save(emp);
    }

    @Transactional
    public String uploadPhoto(Long id, MultipartFile file) throws IOException {
        Employee emp = findEmployee(id);
        Company company = emp.getCompany();
        Organization org = company != null ? company.getOrganization() : null;
        String orgSlug = (org != null && org.getSlug() != null) ? org.getSlug() : "default";
        if (emp.getPhotoPath() != null) fileUploadService.delete(emp.getPhotoPath());
        String path = fileUploadService.storeOrgScoped(file, orgSlug, "employees");
        emp.setPhotoPath(path);
        employeeRepository.save(emp);
        return emp.getPhotoPath();
    }

    public List<EmployeeResponse> getByDepartment(Long departmentId) {
        return employeeRepository.findByDepartmentId(departmentId)
                .stream().map(EmployeeResponse::from).collect(Collectors.toList());
    }

    private String generateBadgeId(Long companyId, String companyName) {
        String code = companyCode(companyName);
        long base = employeeRepository.countByCompanyId(companyId);
        for (int i = 0; i < 1000; i++) {
            String candidate = String.format("EMP-%s-%03d", code, base + 1 + i);
            if (employeeRepository.findByBadgeId(candidate).isEmpty()) {
                return candidate;
            }
        }
        return "EMP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private String companyCode(String name) {
        String[] words = name.trim().split("\\s+");
        StringBuilder code = new StringBuilder();
        for (String w : words) {
            if (code.length() >= 3) break;
            if (!w.isEmpty()) code.append(Character.toUpperCase(w.charAt(0)));
        }
        while (code.length() < 3) code.append('X');
        return code.toString();
    }

    private Employee findEmployee(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", id));
    }

    private Employee buildEmployee(Employee emp, EmployeeRequest req) {
        Company company = companyRepository.findById(req.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", req.getCompanyId()));
        emp.setCompany(company);
        emp.setFirstName(req.getFirstName());
        emp.setLastName(req.getLastName());
        emp.setBadgeId(req.getBadgeId());
        emp.setPhone(req.getPhone());
        emp.setEmail(req.getEmail());
        emp.setGender(req.getGender());
        emp.setDateOfBirth(req.getDateOfBirth());
        emp.setMaritalStatus(req.getMaritalStatus());
        emp.setNationality(req.getNationality());
        emp.setCountryOfBirth(req.getCountryOfBirth());
        emp.setPlaceOfBirth(req.getPlaceOfBirth());
        emp.setPermanentAddress(req.getPermanentAddress());
        emp.setCurrentAddress(req.getCurrentAddress());
        emp.setCountry(req.getCountry());
        emp.setState(req.getState());
        emp.setCity(req.getCity());
        emp.setZip(req.getZip());
        emp.setWorkEmail(req.getWorkEmail());
        emp.setWorkPhone(req.getWorkPhone());
        emp.setQualification(req.getQualification());
        emp.setExperience(req.getExperience());
        emp.setChildren(req.getChildren());
        emp.setEmergencyContact(req.getEmergencyContact());
        emp.setEmergencyContactName(req.getEmergencyContactName());
        emp.setEmergencyContactRelation(req.getEmergencyContactRelation());
        emp.setDateJoining(req.getDateJoining());
        emp.setEmployeeType(req.getEmployeeType());
        if (req.getDepartmentId() != null) emp.setDepartment(departmentRepository.findById(req.getDepartmentId()).orElse(null));
        if (req.getJobPositionId() != null) emp.setJobPosition(jobPositionRepository.findById(req.getJobPositionId()).orElse(null));
        if (req.getJobRoleId() != null) emp.setJobRole(jobRoleRepository.findById(req.getJobRoleId()).orElse(null));
        if (req.getWorkTypeId() != null) emp.setWorkType(workTypeRepository.findById(req.getWorkTypeId()).orElse(null));
        if (req.getShiftId() != null) emp.setShift(shiftScheduleRepository.findById(req.getShiftId()).orElse(null));
        if (req.getReportingManagerId() != null) emp.setReportingManager(employeeRepository.findById(req.getReportingManagerId()).orElse(null));
        if (req.getIsActive() != null) emp.setActive(req.getIsActive());
        return emp;
    }
}
