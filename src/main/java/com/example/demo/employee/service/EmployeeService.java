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
import com.example.demo.base.service.EmailService;
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
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
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
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Queue;
import java.util.Set;
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
    private final com.example.demo.auth.service.EmployeeCompanyGuard employeeCompanyGuard;
    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;
    private final JobRoleRepository jobRoleRepository;
    private final WorkTypeRepository workTypeRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;
    private final ContractRepository contractRepository;
    private final FileUploadService fileUploadService;
    private final EmployeeWorkInformationRepository workInfoRepository;
    private final ReportingManagerService reportingManagers;
    private final EmailService emailService;
    private final com.example.demo.leave.service.NewJoinerLeaveEntitlementService newJoinerLeaveEntitlementService;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Lists employees visible to the current user based on their access scope.
     *   SELF scope        → only the employee record linked to the current user
     *   DEPARTMENT scope  → only employees in the user's department
     *   BRANCH scope      → all employees in the branch
     *   ENTERPRISE scope  → all employees across HO + all branches
     */
    @Transactional(readOnly = true)
    public Page<EmployeeResponse> getAll(Pageable pageable, Long filterByCompanyId) {
        return getAll(pageable, filterByCompanyId, true);
    }

    @Transactional(readOnly = true)
    public Page<EmployeeResponse> getAll(Pageable pageable, Long filterByCompanyId, boolean active) {
        AccessScopeContext.ScopeData scope = AccessScopeContext.get();

        // SELF scope: return only the employee record linked to the current user
        if (scope != null && scope.isSelfScope()) {
            return employeeRepository.findByUserId(scope.getUserId())
                    .map(e -> {
                        Contract contract = contractRepository.findByEmployeeId(e.getId())
                                .stream().findFirst().orElse(null);
                        return (Page<EmployeeResponse>) new PageImpl<>(
                                Collections.singletonList(responseWithManager(e, contract)), pageable, 1);
                    })
                    .orElse(Page.empty(pageable));
        }

        // DEPARTMENT scope: only employees in the user's department
        // Other scopes: company-level filter.
        // NOTE: byDepartmentOrCompany() now ALSO honors the X-Filter-Company-Id header (topbar
        // branch switcher) centrally via ScopeFilter.applyBranchFilter. The explicit
        // filterByCompanyId query param (in-page company dropdown) takes precedence and is
        // applied here as Priority 1.
        Specification<Employee> spec = ScopeFilter.byDepartmentOrCompany();

        if (filterByCompanyId != null && (scope == null || scope.canAccess(filterByCompanyId))) {
            final Long compId = filterByCompanyId;
            Specification<Employee> companyFilter = (root, query, cb) ->
                    cb.equal(root.get("company").get("id"), compId);
            spec = spec != null ? spec.and(companyFilter) : companyFilter;
        }

        Specification<Employee> activeFilter = (root, query, cb) -> cb.equal(root.get("isActive"), active);
        spec = spec != null ? spec.and(activeFilter) : activeFilter;

        Page<Employee> page = spec != null
                ? employeeRepository.findAll(spec, pageable)
                : employeeRepository.findAll(pageable);

        // Fetch contracts for all employees in this page in one query to avoid N+1
        List<Long> employeeIds = page.getContent().stream().map(Employee::getId).collect(Collectors.toList());
        Map<Long, Contract> contractByEmployeeId = contractRepository.findByEmployeeIdIn(employeeIds)
                .stream().collect(Collectors.toMap(c -> c.getEmployee().getId(), c -> c, (a, b) -> a));

        return page.map(e -> responseWithManager(e, contractByEmployeeId.get(e.getId())));
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getById(Long id) {
        Employee emp = findEmployee(id);
        Contract contract = contractRepository.findByEmployeeId(id).stream().findFirst().orElse(null);
        return responseWithManager(emp, contract);
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
     *
     * IMPORTANT: this always re-resolves the schema from req.getCompanyId() rather
     * than only when TenantContext is at the default "public" tenant. A previous
     * version only corrected the schema when at default, which meant a stale
     * X-Company-Id header from an earlier request (e.g. the UI hadn't updated its
     * "active org" header after the user switched organizations in the picker)
     * would silently write the new employee into the WRONG tenant schema, even
     * though its company_id FK correctly pointed at the intended organization.
     * The employee would then be invisible when filtering by that organization,
     * while still showing up in the cross-schema "All Companies" view.
     *
     * STRICT GUARD: an employee can never be created without a company — this is
     * the single choke point both EmployeeController#create (single) and
     * EmployeeService#bulkImport (every row of an import) funnel through, so one
     * explicit check here covers both. @NotNull on EmployeeRequest.companyId
     * already blocks the single-create HTTP endpoint, and the import endpoint's
     * companyId is a required @RequestParam — but neither produces a clean error
     * for any other caller, and a null id here would otherwise surface as a raw
     * "findById(null)" IllegalArgumentException instead of a clear message.
     */
    public EmployeeResponse create(EmployeeRequest req) {
        if (req.getCompanyId() == null) {
            throw new BadRequestException("A company/organization must be selected to create an employee");
        }
        resolveTenantForCompany(req.getCompanyId());
        return self.doCreate(req);
    }

    /**
     * Re-resolves TenantContext to the schema owning companyId, if it differs from
     * whatever schema is currently set. Every single-employee-by-id operation
     * (update/delete/hardDelete/...) needs this: employee numeric ids are only
     * unique WITHIN a schema, not globally — the "All Companies" platform-admin
     * view lists employees from every org's schema side by side, so two different
     * orgs can both have an employee with id=16. Acting on a specific row from
     * that view must pin the schema to THAT row's company, or the lookup runs
     * against whatever schema TenantContext happens to already be on (often
     * "public", since All-Companies mode sends no X-Company-Id header at all) and
     * fails with a misleading "Employee not found with id: 16" even though the
     * employee genuinely exists — just in a different schema.
     */
    private void resolveTenantForCompany(Long companyId) {
        if (companyId == null) return;
        Company targetCompany = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        String schema = targetCompany.isHeadOffice()
                ? targetCompany.getSchemaName()
                : (targetCompany.getParentCompanyId() != null
                    ? companyRepository.findById(targetCompany.getParentCompanyId())
                          .map(Company::getSchemaName).orElse(null)
                    : null);
        if (schema != null && !schema.isBlank() && !schema.equals(TenantContext.getTenant())) {
            log.info("[tenant] resolving schema='{}' from companyId={} (was '{}')",
                    schema, companyId, TenantContext.getTenant());
            TenantContext.setTenant(schema);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public EmployeeResponse doCreate(EmployeeRequest req) {
        log.info("[create] email={} companyId={}", req.getEmail(), req.getCompanyId());
        String normalizedEmail = normalizeEmail(req.getEmail());
        req.setEmail(normalizedEmail);
        if (normalizedEmail != null && employeeRepository.findFirstByNormalizedEmail(normalizedEmail).isPresent()) {
            throw new BadRequestException("Employee with this email already exists");
        }
        // A manually-entered Employee/Badge ID must be unique — badge_id has a DB-level
        // unique constraint, so without this check a duplicate would surface as a raw
        // constraint-violation error instead of a clear message. A blank one is left
        // alone here; it gets auto-generated further down.
        if (req.getBadgeId() != null && !req.getBadgeId().isBlank()
                && employeeRepository.findFirstByNormalizedBadgeId(req.getBadgeId().trim()).isPresent()) {
            throw new BadRequestException("Employee ID '" + req.getBadgeId().trim() + "' is already in use");
        }

        // Check subscription plan employee limit before creating
        Company company = companyRepository.findById(req.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", req.getCompanyId()));

        // Defense in depth: a Head Office's tenant schema must be fully provisioned
        // (all tables created) before any Employee row can be written into it — see
        // CompanyService#createHeadOffice, which flips schemaReady true only after
        // provisioning succeeds. If this is ever false here, creating/importing an
        // employee would otherwise fail with a raw "relation does not exist" SQL
        // error (or worse, land in a leftover schema from a previous request) —
        // fail fast with a clear message instead.
        Company schemaOwner = company.isHeadOffice()
                ? company
                : (company.getParentCompanyId() != null
                    ? companyRepository.findById(company.getParentCompanyId()).orElse(null)
                    : null);
        if (schemaOwner != null && !schemaOwner.isSchemaReady()) {
            throw new BadRequestException(
                    "This organization's workspace is still being set up. Please wait a few seconds and try again.");
        }

        Organization org = company.getOrganization();
        if (org != null && org.getSubscriptionPlan() != null) {
            int planMaxEmployees = org.getSubscriptionPlan().getMaxEmployees();
            if (planMaxEmployees != Integer.MAX_VALUE) {
                List<Company> orgCompanies = companyRepository.findByOrganizationId(org.getId());
                long currentCount = orgCompanies.stream()
                        .mapToLong(c -> employeeRepository.countByCompanyIdAndIsActiveTrue(c.getId()))
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
        boolean newUserAccount = false;
        if (req.getEmail() != null && !req.getEmail().isBlank()) {
            boolean[] isNewUser = {false};
            log.info("[create] looking up user by email={}", req.getEmail());
            User user = userRepository.findByNormalizedEmail(req.getEmail()).orElseGet(() -> {
                isNewUser[0] = true;
                log.info("[create] user not found, registering new user for email={}", req.getEmail());
                RegisterRequest reg = new RegisterRequest();
                reg.setUsername(req.getPhone() != null && !req.getPhone().isBlank()
                        ? req.getPhone().trim()
                        : req.getEmail());
                reg.setEmail(req.getEmail());
                reg.setPassword(EmployeeInitialPassword.resolve(req.getPassword(), req.getPhone(),
                        company.getCountry() != null && !company.getCountry().isBlank() ? company.getCountry() : req.getCountry()));
                reg.setFirstName(req.getFirstName());
                reg.setLastName(req.getLastName());
                reg.setCompanyId(null); // role assignment handled explicitly below
                return authService.register(reg);
            });
            if (isNewUser[0]) {
                user.setMustChangePassword(true);
                user = userRepository.save(user);
                newUserAccount = true;
            }
            employeeCompanyGuard.validateEmployment(user.getId(), req.getCompanyId());
            emp.setUser(user);

            // Assign role: use selected role, or default to EMPLOYEE+SELF.
            // Defaults regardless of isNewUser — a pre-existing user account linked to a new
            // Employee record still needs a role in this company, otherwise they end up with
            // zero access and no indication why (see: sivaprasadmutluru@gmail.com incident).
            Role.RoleName roleName = req.getRole() != null ? req.getRole() : Role.RoleName.EMPLOYEE;
            UserRole.AccessScope scope = req.getAccessScope() != null ? req.getAccessScope() : UserRole.AccessScope.SELF;
            log.info("[create] isNewUser={} roleName={} scope={} userId={} companyId={}", isNewUser[0], roleName, scope, user.getId(), req.getCompanyId());
            if (roleName != null && scope != null && !userRoleService.hasRole(user.getId(), req.getCompanyId(), roleName)) {
                log.info("[create] assigning role={} to userId={}", roleName, user.getId());
                AssignRoleRequest roleReq = new AssignRoleRequest();
                roleReq.setUserId(user.getId());
                roleReq.setRoleName(roleName);
                roleReq.setCompanyId(req.getCompanyId());
                roleReq.setAccessScope(scope);
                // This assignment is generated as part of employee onboarding,
                // not entered through the manual Roles & Access form. Keep an
                // explicit audit reason so the canonical role validator can
                // distinguish and record the system-driven grant.
                roleReq.setReason("Automatic assignment during employee creation");
                userRoleService.assignRole(roleReq);
            }
        }

        log.info("[create] saving employee firstName={} companyId={}", emp.getFirstName(), req.getCompanyId());
        Employee saved = employeeRepository.save(emp);
        newJoinerLeaveEntitlementService.grantFor(saved);
        log.info("[create] saved employee id={}, creating contract & workInfo", saved.getId());
        Contract contract = createDefaultContract(saved, req);
        createDefaultWorkInfo(saved);
        if (newUserAccount && saved.getEmail() != null && !saved.getEmail().isBlank()) {
            emailService.ensureOnboardingTemplates(company);
            emailService.sendFromTemplate(company.getId(), EmailService.EMPLOYEE_ACCOUNT_CREATED_TEMPLATE,
                    saved.getEmail(), Map.of(
                            "recipientName", saved.getFirstName() == null ? "there" : saved.getFirstName(),
                            "companyName", company.getName(),
                            "username", saved.getUser().getUsername(),
                            "loginUrl", "https://grecha.ai/login",
                            "passwordResetUrl", "https://grecha.ai/forgot-password"), saved);
        }
        log.info("[create] done for employee id={}", saved.getId());
        return responseWithManager(saved, contract);
    }

    public Map<String, Object> bulkImport(List<EmployeeRequest> requests) {
        int success = 0;
        List<Map<String, String>> failures = new ArrayList<>();
        if (requests == null || requests.isEmpty()) {
            return Map.of("totalRows", 0, "successCount", 0, "failureCount", 0, "failures", failures);
        }

        // Importing a spreadsheet is a batch operation, so perform identity checks
        // before creating any row.  A blank email used to bypass duplicate detection,
        // then a re-upload received a freshly generated badge ID and created another
        // employee.  Imports now require a stable identity and reject both spreadsheet
        // duplicates and existing archived/active employee records.
        Long companyId = requests.get(0).getCompanyId();
        if (companyId == null || requests.stream().anyMatch(req -> !companyId.equals(req.getCompanyId()))) {
            throw new BadRequestException("All imported employees must belong to one selected company");
        }
        resolveTenantForCompany(companyId);
        Map<Integer, String> preflightFailures = new HashMap<>();
        Map<String, Integer> rowsByIdentity = new HashMap<>();
        for (int i = 0; i < requests.size(); i++) {
            EmployeeRequest req = requests.get(i);
            String email = normalizeEmail(req.getEmail());
            String badgeId = normalizeIdentifier(req.getBadgeId());
            req.setEmail(email);
            req.setBadgeId(badgeId);

            if (email == null && badgeId == null) {
                preflightFailures.put(i, "Email or Employee ID is required for import duplicate protection");
                continue;
            }
            String conflict = findImportIdentityConflict(email, badgeId, rowsByIdentity, i + 2);
            if (conflict != null) {
                preflightFailures.put(i, conflict);
            }
        }
        for (int i = 0; i < requests.size(); i++) {
            EmployeeRequest req = requests.get(i);
            try {
                if (preflightFailures.containsKey(i)) {
                    throw new BadRequestException(preflightFailures.get(i));
                }
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

    private String findImportIdentityConflict(String email, String badgeId,
                                              Map<String, Integer> rowsByIdentity, int spreadsheetRow) {
        if (email != null) {
            String emailKey = "email:" + email;
            Integer priorRow = rowsByIdentity.putIfAbsent(emailKey, spreadsheetRow);
            if (priorRow != null) return "Duplicate email in this spreadsheet (also on row " + priorRow + ")";
            if (employeeRepository.findFirstByNormalizedEmail(email).isPresent()) {
                return "An employee with this email already exists; restore or update that employee instead";
            }
        }
        if (badgeId != null) {
            String badgeKey = "badge:" + badgeId.toLowerCase(Locale.ROOT);
            Integer priorRow = rowsByIdentity.putIfAbsent(badgeKey, spreadsheetRow);
            if (priorRow != null) return "Duplicate Employee ID in this spreadsheet (also on row " + priorRow + ")";
            if (employeeRepository.findFirstByNormalizedBadgeId(badgeId).isPresent()) {
                return "Employee ID '" + badgeId + "' is already in use";
            }
        }
        return null;
    }

    private String normalizeIdentifier(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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

    // Same TenantContext staleness problem as create() — see resolveTenantForCompany's
    // javadoc — and the same "must set TenantContext before the @Transactional proxy
    // acquires a connection" constraint, hence the wrapper/doUpdate split.
    public EmployeeResponse update(Long id, EmployeeRequest req) {
        String originalTenant = TenantContext.getTenant();
        if (req.getCompanyId() != null) {
            resolveTenantForCompany(req.getCompanyId());
            if (!TenantContext.DEFAULT_TENANT.equals(originalTenant) && !originalTenant.equals(TenantContext.getTenant())) {
                TenantContext.setTenant(originalTenant);
                throw new BadRequestException("Cannot change an employee's organization through employee edit. Select the original company and use a reviewed transfer process.");
            }
        }
        return self.doUpdate(id, req);
    }

    @Transactional
    public EmployeeResponse doUpdate(Long id, EmployeeRequest req) {
        Employee emp = findEmployee(id);

        if (req.getCompanyId() != null && !req.getCompanyId().equals(emp.getCompany().getId())) {
            throw new BadRequestException("Company changes require a reviewed employee transfer, not an ordinary edit.");
        }

        if (req.getBadgeId() != null && !req.getBadgeId().isBlank()) {
            String requestedBadgeId = req.getBadgeId().trim();
            employeeRepository.findByBadgeId(requestedBadgeId)
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new BadRequestException("Employee ID '" + requestedBadgeId + "' is already in use");
                    });
        }

        // An employee's email is also their login email when the profile is linked to a
        // user account.  Previously this edit changed only the tenant employee row,
        // leaving public.users on the old email.  That made the newly saved address
        // impossible to use at login.  Validate the target first, then update both
        // records in this transaction so the two identities cannot drift apart.
        String requestedEmail = normalizeEmail(req.getEmail());
        if (requestedEmail != null) {
            employeeRepository.findByEmail(requestedEmail)
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new BadRequestException("Email '" + requestedEmail + "' is already assigned to another employee");
                    });
            synchronizeLinkedLoginEmail(emp, requestedEmail);
            req.setEmail(requestedEmail);
        }

        // Preserve the manager configured in Work Information when another
        // employee field is edited without supplying a manager change.
        emp.setReportingManager(reportingManagers.resolve(emp));
        buildEmployee(emp, req);
        // Link to user account if not already linked and email is provided
        if (emp.getUser() == null && req.getEmail() != null && !req.getEmail().isBlank()) {
            userRepository.findByEmail(req.getEmail()).ifPresent(user -> {
                employeeCompanyGuard.validateEmployment(user.getId(), emp.getCompany().getId());
                emp.setUser(user);
            });
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
        return responseWithManager(saved, contract);
    }

    /**
     * Keeps the shared login identity aligned with the employee profile.  This is
     * deliberately performed before the employee is saved: an email owned by a
     * different account is rejected without making a partial profile change.
     */
    private void synchronizeLinkedLoginEmail(Employee employee, String requestedEmail) {
        User linkedUser = employee.getUser();
        if (linkedUser == null || requestedEmail.equalsIgnoreCase(linkedUser.getEmail())) {
            return;
        }

        userRepository.findByEmail(requestedEmail)
                .filter(otherUser -> !otherUser.getId().equals(linkedUser.getId()))
                .ifPresent(otherUser -> {
                    throw new BadRequestException(
                            "Login email '" + requestedEmail + "' already belongs to another user. "
                                    + "Use a different email or resolve the duplicate account first.");
                });

        linkedUser.setEmail(requestedEmail);
        userRepository.save(linkedUser);
        log.info("[employee-update] synchronized login email for employeeId={} userId={}",
                employee.getId(), linkedUser.getId());
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) return null;
        return email.trim().toLowerCase();
    }

    // companyId (query param, threaded from the row the frontend already has) pins the
    // schema before lookup — see resolveTenantForCompany's javadoc for why this matters
    // specifically for actions taken from the "All Companies" global view.
    public void delete(Long id, Long companyId) {
        resolveTenantForCompany(companyId);
        self.doDelete(id);
    }

    @Transactional
    public void doDelete(Long id) {
        Employee emp = findEmployee(id);
        emp.setActive(false);
        employeeRepository.save(emp);
    }

    public void restore(Long id, Long companyId) {
        resolveTenantForCompany(companyId);
        self.doRestore(id);
    }

    @Transactional
    public void doRestore(Long id) {
        Employee emp = findEmployee(id);
        emp.setActive(true);
        employeeRepository.save(emp);
    }

    /**
     * Permanently deletes an employee and every row in the current tenant schema that
     * (transitively) references it, by discovering foreign keys at runtime rather than
     * hardcoding table names — the employees table is referenced by ~100 tables (attendance,
     * payroll, leave, tickets, etc.), directly and indirectly (e.g. attendances is a direct
     * dependent, attendance_late_come_early_out depends on attendances rather than employees
     * directly), and that graph changes as features are added.
     *
     * PLATFORM_SUPER_ADMIN only, irreversible. Intended for cleaning up broken/junk records
     * (e.g. duplicate stubs from bugs), not routine offboarding — use delete() for that.
     */
    public Map<String, Object> hardDelete(Long id, Long companyId) {
        resolveTenantForCompany(companyId);
        return self.doHardDelete(id);
    }

    @Transactional
    public Map<String, Object> doHardDelete(Long id) {
        findEmployee(id); // 404s if it doesn't exist in the current tenant schema

        org.hibernate.Session session = entityManager.unwrap(org.hibernate.Session.class);
        return session.doReturningWork(conn -> {

            // Self-referencing FK (reporting_manager_id) isn't caught by the generic BFS below
            // since it points from employees back to employees — null it out rather than deleting
            // whoever reports to this person.
            try (var st = conn.createStatement()) {
                st.executeUpdate("UPDATE employees SET reporting_manager_id = NULL WHERE reporting_manager_id = " + id);
            }

            // Precompute which tables in this schema have an 'id' column (pg_catalog — fast),
            // so the BFS below never has to *attempt* a SELECT id on a table that doesn't have one.
            // A failed statement doesn't just throw in Postgres — it poisons the rest of the
            // transaction (every subsequent statement fails with "transaction is aborted") unless
            // rolled back to a savepoint, so this must be known up front, not discovered via try/catch.
            Set<String> tablesWithId = new HashSet<>();
            try (var ps = conn.prepareStatement(
                    "SELECT c.relname FROM pg_attribute a " +
                    "JOIN pg_class c ON c.oid = a.attrelid " +
                    "JOIN pg_namespace n ON n.oid = c.relnamespace " +
                    "WHERE n.nspname = current_schema() AND a.attname = 'id' " +
                    "  AND a.attnum > 0 AND NOT a.attisdropped AND c.relkind = 'r'");
                 var rs = ps.executeQuery()) {
                while (rs.next()) tablesWithId.add(rs.getString(1));
            }

            // Load every FK edge in the current tenant schema: parentTable -> [(childTable, childColumn, isNullable)].
            Map<String, List<String[]>> fkEdges = new HashMap<>();
            try (var ps = conn.prepareStatement(
                    "SELECT ccu.table_name AS parent_table, tc.table_name AS child_table, kcu.column_name AS child_column, " +
                    "       col.is_nullable AS is_nullable " +
                    "FROM information_schema.table_constraints tc " +
                    "JOIN information_schema.key_column_usage kcu " +
                    "  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema " +
                    "JOIN information_schema.constraint_column_usage ccu " +
                    "  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema " +
                    "JOIN information_schema.columns col " +
                    "  ON col.table_schema = tc.table_schema AND col.table_name = tc.table_name AND col.column_name = kcu.column_name " +
                    "WHERE tc.constraint_type = 'FOREIGN KEY' " +
                    "  AND tc.table_schema = current_schema() AND ccu.table_schema = current_schema() " +
                    "  AND tc.table_name <> ccu.table_name");
                 var rs = ps.executeQuery()) {
                while (rs.next()) {
                    fkEdges.computeIfAbsent(rs.getString(1), k -> new ArrayList<>())
                            .add(new String[]{rs.getString(2), rs.getString(3), rs.getString(4)});
                }
            }

            // BFS outward from "employees", tracking each discovered table's row IDs so we can
            // find ITS dependents too (attendances -> attendance_late_come_early_out, etc.).
            //
            // Not every FK pointing at employees means "this row belongs to the deleted employee" —
            // e.g. loan_requests.reviewed_by, departments.manager_id, tickets.assigned_to_id reference
            // an employee acting ON someone else's row, not ownership of it. Deleting those rows would
            // destroy a DIFFERENT employee's real data. Nullable columns are treated as such references
            // and severed (set NULL) rather than deleted; only NOT NULL columns are treated as ownership
            // (that row cannot exist without this employee) and cascade-deleted.
            //
            // Every statement runs under its own savepoint: an unexpected failure (e.g. a table with
            // additional constraints this heuristic doesn't foresee) is rolled back to that savepoint
            // and logged, rather than poisoning every statement that runs after it.
            Map<String, String> tableIdLists = new HashMap<>();
            tableIdLists.put("employees", String.valueOf(id));

            Set<String> visited = new HashSet<>(List.of("employees"));
            List<String[]> deleteOrder = new ArrayList<>(); // [table, deleteSql], shallow-to-deep BFS order
            Queue<String> queue = new ArrayDeque<>(List.of("employees"));
            Map<String, Object> severedCounts = new LinkedHashMap<>();

            while (!queue.isEmpty()) {
                String parent = queue.poll();
                String parentIds = tableIdLists.getOrDefault(parent, "");
                if (parentIds.isEmpty()) continue;

                for (String[] edge : fkEdges.getOrDefault(parent, List.of())) {
                    String childTable = edge[0];
                    String childColumn = edge[1];
                    boolean nullable = "YES".equalsIgnoreCase(edge[2]);

                    if (nullable) {
                        // Reference, not ownership — sever the link, leave the row (and its real
                        // owner's data) intact.
                        java.sql.Savepoint sp = conn.setSavepoint();
                        try (var st = conn.createStatement()) {
                            int severed = st.executeUpdate(
                                    "UPDATE \"" + childTable + "\" SET \"" + childColumn + "\" = NULL " +
                                    "WHERE \"" + childColumn + "\" IN (" + parentIds + ")");
                            conn.releaseSavepoint(sp);
                            if (severed > 0) {
                                severedCounts.merge(childTable, severed, (a, b) -> (Integer) a + (Integer) b);
                            }
                        } catch (java.sql.SQLException e) {
                            conn.rollback(sp);
                            log.warn("[hardDelete] Could not sever {}.{}: {}", childTable, childColumn, e.getMessage());
                        }
                        continue;
                    }

                    deleteOrder.add(new String[]{childTable,
                            "DELETE FROM \"" + childTable + "\" WHERE \"" + childColumn + "\" IN (" + parentIds + ")"});

                    // Fetch this child's row IDs before it's deleted, so BFS can expand into ITS
                    // dependents. Tables without an 'id' column (composite-key join tables) are leaves.
                    if (visited.add(childTable) && tablesWithId.contains(childTable)) {
                        java.sql.Savepoint sp = conn.setSavepoint();
                        try (var st = conn.createStatement();
                             var rs = st.executeQuery(
                                     "SELECT id FROM \"" + childTable + "\" WHERE \"" + childColumn + "\" IN (" + parentIds + ")")) {
                            StringBuilder sb = new StringBuilder();
                            while (rs.next()) {
                                if (sb.length() > 0) sb.append(',');
                                sb.append(rs.getLong(1));
                            }
                            conn.releaseSavepoint(sp);
                            if (sb.length() > 0) {
                                tableIdLists.put(childTable, sb.toString());
                                queue.add(childTable);
                            }
                        } catch (java.sql.SQLException e) {
                            conn.rollback(sp);
                            log.warn("[hardDelete] Could not fetch child ids for {}: {}", childTable, e.getMessage());
                        }
                    }
                }
            }

            // Delete deepest dependents first (reverse BFS order) so children are gone before parents.
            Collections.reverse(deleteOrder);
            Map<String, Object> clearedCounts = new LinkedHashMap<>();
            for (String[] entry : deleteOrder) {
                java.sql.Savepoint sp = conn.setSavepoint();
                try (var st = conn.createStatement()) {
                    int cleared = st.executeUpdate(entry[1]);
                    conn.releaseSavepoint(sp);
                    if (cleared > 0) {
                        clearedCounts.merge(entry[0], cleared, (a, b) -> (Integer) a + (Integer) b);
                    }
                } catch (java.sql.SQLException e) {
                    conn.rollback(sp);
                    log.warn("[hardDelete] Could not delete from {}: {}", entry[0], e.getMessage());
                }
            }

            try (var st = conn.createStatement()) {
                st.executeUpdate("DELETE FROM employees WHERE id = " + id);
            }

            log.warn("[hardDelete] Permanently deleted employee id={} — cleared dependent rows: {}, severed references: {}",
                    id, clearedCounts, severedCounts);
            return Map.of("message", "Employee permanently deleted",
                    "clearedDependents", clearedCounts, "severedReferences", severedCounts);
        });
    }

    @Transactional
    public String uploadPhoto(Long id, MultipartFile file) throws IOException {
        // Load within this transaction so the entity is managed and the photo_path
        // UPDATE is guaranteed to flush at commit. (The ESS controller may have loaded
        // a stale/cached copy in a separate context, so we must not trust the caller's copy.)
        Employee emp = findEmployee(id);
        String previousPath = emp.getPhotoPath();

        Company company = emp.getCompany();
        Organization org = company != null ? company.getOrganization() : null;
        String orgSlug = (org != null && org.getSlug() != null) ? org.getSlug() : "default";

        // Store the NEW file BEFORE deleting the old one, so a storage failure does
        // not leave the employee with a dangling/empty photoPath.
        String path = fileUploadService.storeOrgScoped(file, orgSlug, "employees");

        emp.setPhotoPath(path);
        // Explicit save + flush so the photo_path UPDATE is committed even if the
        // transaction wraps multiple operations and something later throws.
        Employee saved = employeeRepository.saveAndFlush(emp);

        // Now safe to remove the previous file.
        if (previousPath != null && !previousPath.equals(path)) {
            fileUploadService.delete(previousPath);
        }
        return saved.getPhotoPath();
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

    private EmployeeResponse responseWithManager(Employee employee, Contract contract) {
        EmployeeResponse response = EmployeeResponse.from(employee, contract);
        Employee manager = reportingManagers.resolve(employee);
        response.setReportingManagerId(manager == null ? null : manager.getId());
        response.setReportingManagerName(manager == null ? null :
                ((manager.getFirstName() == null ? "" : manager.getFirstName()) + " " +
                        (manager.getLastName() == null ? "" : manager.getLastName())).trim());
        return response;
    }

    private Employee buildEmployee(Employee emp, EmployeeRequest req) {
        Company company = companyRepository.findById(req.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", req.getCompanyId()));
        emp.setCompany(company);
        emp.setFirstName(req.getFirstName());
        emp.setLastName(req.getLastName());
        emp.setBadgeId(req.getBadgeId() != null && !req.getBadgeId().isBlank() ? req.getBadgeId().trim() : null);
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
        if (req.getReportingManagerId() != null) emp.setReportingManager(reportingManagers.validate(emp, req.getReportingManagerId()));
        if (req.getIsActive() != null) emp.setActive(req.getIsActive());
        return emp;
    }
}
