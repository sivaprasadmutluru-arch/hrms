package com.example.demo.common.seeder;

import com.example.demo.auth.entity.Permission;
import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.PermissionRepository;
import com.example.demo.auth.repository.RoleRepository;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.base.entity.*;
import com.example.demo.base.enums.SubscriptionPlan;
import com.example.demo.base.repository.*;
import com.example.demo.common.tenant.SchemaProvisioningService;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.leave.entity.LeaveAllocation;
import com.example.demo.leave.entity.LeaveType;
import com.example.demo.leave.repository.LeaveAllocationRepository;
import com.example.demo.leave.repository.LeaveTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

/**
 * Runs once at application startup to create:
 *   1. All permissions (module:action pairs)
 *   2. All 8 roles with appropriate permission sets
 *   3. The default Prabha Tech organization + Head Office
 *   4. The Platform Super Admin user (login: admin / admin123)
 *   5. Sample client org "Yuwa Tech Solutions" with:
 *        - Head Office (Chennai)
 *        - Branch: Bangalore Office
 *        - Branch: Mumbai Office
 *        - One user per role, fully assigned
 *
 * This is safe to run multiple times — all methods check before inserting.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final OrganizationRepository organizationRepository;
    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;
    private final JobRoleRepository jobRoleRepository;
    private final WorkTypeRepository workTypeRepository;
    private final ShiftScheduleRepository shiftScheduleRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveAllocationRepository leaveAllocationRepository;
    private final PasswordEncoder passwordEncoder;
    private final SchemaProvisioningService schemaProvisioningService;

    // All module permissions: module name -> allowed actions
    private static final Map<String, String[]> MODULE_PERMISSIONS = new LinkedHashMap<>();

    static {
        MODULE_PERMISSIONS.put("employee",    new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("attendance",  new String[]{"view", "create", "edit", "delete", "approve"});
        MODULE_PERMISSIONS.put("leave",       new String[]{"view", "create", "edit", "delete", "approve"});
        MODULE_PERMISSIONS.put("payroll",     new String[]{"view", "create", "edit", "delete", "approve"});
        MODULE_PERMISSIONS.put("recruitment", new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("onboarding",  new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("offboarding", new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("pms",         new String[]{"view", "create", "edit", "delete", "approve"});
        MODULE_PERMISSIONS.put("asset",       new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("helpdesk",    new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("project",     new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("company",     new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("department",  new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("report",      new String[]{"view", "export"});
        MODULE_PERMISSIONS.put("organization",new String[]{"view", "create", "edit", "delete"});
    }

    @Override
    public void run(String... args) {
        log.info("Starting data seeding...");
        seedPermissions();
        seedRoles();
        seedDefaultOrganizationAndCompany();
        seedPlatformSuperAdmin();
        seedSampleCompaniesAndUsers();
        seedSampleTenantData();
        log.info("Data seeding complete.");
    }

    // ---------- Step 1: Permissions ----------

    private void seedPermissions() {
        MODULE_PERMISSIONS.forEach((module, actions) -> {
            for (String action : actions) {
                String permName = module + ":" + action;
                if (permissionRepository.findByName(permName).isEmpty()) {
                    Permission p = new Permission();
                    p.setName(permName);
                    p.setDisplayName(capitalize(action) + " " + capitalize(module));
                    p.setModule(module);
                    permissionRepository.save(p);
                }
            }
        });
        log.info("Permissions seeded.");
    }

    // ---------- Step 2: Roles ----------

    private void seedRoles() {
        Map<String, Permission> all = new HashMap<>();
        permissionRepository.findAll().forEach(p -> all.put(p.getName(), p));

        /*
         * PLATFORM_SUPER_ADMIN — Prabha Tech internal admin
         * Has all permissions. Manages organizations and companies.
         */
        createRole(Role.RoleName.PLATFORM_SUPER_ADMIN,
                "Platform Super Admin",
                "Prabha Tech internal — manages all client organizations",
                allPermissions(all));

        /*
         * ENTERPRISE_ADMIN — Head Office Admin
         * Full access to Head Office + all branches. The most powerful client role.
         */
        createRole(Role.RoleName.ENTERPRISE_ADMIN,
                "Enterprise Admin (Head Office)",
                "Full access to Head Office and all branches",
                allPermissions(all));

        /*
         * BRANCH_ADMIN — Branch Manager
         * Full access within their branch only. Cannot see other branches.
         */
        createRole(Role.RoleName.BRANCH_ADMIN,
                "Branch Admin",
                "Full access within one branch",
                perms(all,
                        "employee:view", "employee:create", "employee:edit", "employee:delete",
                        "attendance:view", "attendance:create", "attendance:edit", "attendance:approve",
                        "leave:view", "leave:create", "leave:edit", "leave:approve",
                        "payroll:view", "payroll:create", "payroll:edit",
                        "recruitment:view", "recruitment:create", "recruitment:edit",
                        "onboarding:view", "onboarding:create", "onboarding:edit",
                        "offboarding:view", "offboarding:create", "offboarding:edit",
                        "asset:view", "asset:create", "asset:edit",
                        "helpdesk:view", "helpdesk:create", "helpdesk:edit", "helpdesk:delete", "helpdesk:approve",
                        "pms:view", "pms:create", "pms:edit",
                        "project:view", "project:create", "project:edit",
                        "department:view", "department:create", "department:edit",
                        "report:view", "report:export"));

        /*
         * HR_MANAGER — HR operations (used at both Head Office level and Branch level)
         * The access scope (HEAD_OFFICE vs BRANCH) in UserRole determines what data they see.
         */
        createRole(Role.RoleName.HR_MANAGER,
                "HR Manager",
                "HR operations — scope (HEAD_OFFICE or BRANCH) set in user assignment",
                perms(all,
                        "employee:view", "employee:create", "employee:edit",
                        "attendance:view", "attendance:create", "attendance:edit", "attendance:approve",
                        "leave:view", "leave:create", "leave:edit", "leave:approve",
                        "recruitment:view", "recruitment:create", "recruitment:edit",
                        "onboarding:view", "onboarding:create", "onboarding:edit",
                        "offboarding:view", "offboarding:create", "offboarding:edit",
                        "department:view", "department:create", "department:edit",
                        "report:view", "report:export"));

        /*
         * ACCOUNTANT — Finance and Payroll (used at both Head Office level and Branch level)
         * The access scope in UserRole determines whether they see one branch or all branches.
         */
        createRole(Role.RoleName.ACCOUNTANT,
                "Accountant / Payroll Manager",
                "Payroll and finance — scope (HEAD_OFFICE or BRANCH) set in user assignment",
                perms(all,
                        "payroll:view", "payroll:create", "payroll:edit", "payroll:approve",
                        "employee:view",
                        "report:view", "report:export"));

        /*
         * DEPARTMENT_MANAGER — Manages one department within a branch
         * Approves leave and attendance for their department team.
         */
        createRole(Role.RoleName.DEPARTMENT_MANAGER,
                "Department Manager",
                "Manages one department — approvals, team visibility",
                perms(all,
                        "employee:view",
                        "attendance:view", "attendance:approve",
                        "leave:view", "leave:approve",
                        "pms:view", "pms:create", "pms:edit",
                        "project:view", "project:create", "project:edit",
                        "helpdesk:view",
                        "report:view"));

        /*
         * TEAM_LEAD — Senior individual contributor
         * Limited approvals and team visibility within their department.
         */
        createRole(Role.RoleName.TEAM_LEAD,
                "Team Lead",
                "Team visibility and limited approvals",
                perms(all,
                        "employee:view",
                        "attendance:view", "attendance:approve",
                        "leave:view",
                        "pms:view", "pms:create",
                        "project:view", "project:edit",
                        "helpdesk:view", "helpdesk:create"));

        /*
         * EMPLOYEE — Self-service only (ESS)
         * Can only see and manage their own data.
         */
        createRole(Role.RoleName.EMPLOYEE,
                "Employee (Self Service)",
                "Self-service: own profile, leave, attendance, payslip",
                perms(all,
                        "attendance:view", "attendance:create",
                        "leave:view", "leave:create",
                        "payroll:view",
                        "helpdesk:view", "helpdesk:create",
                        "pms:view"));

        log.info("Roles seeded: 8 roles created.");
    }

    // ---------- Step 3: Default Organization and Head Office ----------

    private void seedDefaultOrganizationAndCompany() {
        // Create Prabha Tech organization (the platform owner)
        Organization praabhaTech = organizationRepository.findBySlug("praabha-tech")
                .orElseGet(() -> {
                    Organization org = new Organization();
                    org.setName("Prabha Tech");
                    org.setSlug("praabha-tech");
                    org.setContactEmail("admin@prabhatech.com");
                    org.setSubscriptionPlan(SubscriptionPlan.ENTERPRISE);
                    org.setStatus(Organization.OrgStatus.ACTIVE);
                    Organization saved = organizationRepository.save(org);
                    log.info("Created default organization: Prabha Tech");
                    return saved;
                });

        // Create default Head Office under Prabha Tech
        Company headOffice = companyRepository.findByOrganizationIdAndCompanyType(praabhaTech.getId(), Company.CompanyType.HEAD_OFFICE)
                .orElseGet(() -> {
                    Company ho = new Company();
                    ho.setName("Prabha Tech Head Office");
                    ho.setCompanyType(Company.CompanyType.HEAD_OFFICE);
                    ho.setStatus(Company.CompanyStatus.ACTIVE);
                    ho.setOrganization(praabhaTech);
                    ho.setBranchLimit(5);
                    ho.setEmail("admin@prabhatech.com");
                    Company saved = companyRepository.save(ho);
                    log.info("Created default Head Office: Prabha Tech Head Office (ID: {})", saved.getId());
                    return saved;
                });

        // Provision tenant schema for the Prabha Tech Head Office (idempotent)
        String schemaName = SchemaProvisioningService.toSchemaName("prabha_tech");
        if (headOffice.getSchemaName() == null) {
            headOffice.setSchemaName(schemaName);
            companyRepository.save(headOffice);
        }
        try {
            schemaProvisioningService.provisionSchema(schemaName);
        } catch (Exception e) {
            log.warn("Schema provisioning skipped (may already exist): {}", e.getMessage());
        }
    }

    // ---------- Step 4: Platform Super Admin user ----------

    private void seedPlatformSuperAdmin() {
        if (userRepository.findByUsername("admin").isPresent()) {
            return; // Already seeded
        }

        User admin = new User();
        admin.setUsername("admin");
        admin.setEmail("admin@prabhatech.com");
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setFirstName("Platform");
        admin.setLastName("Admin");
        admin.setSuperuser(true);
        admin = userRepository.save(admin);

        Role platformAdminRole = roleRepository.findByName(Role.RoleName.PLATFORM_SUPER_ADMIN)
                .orElseThrow(() -> new RuntimeException("PLATFORM_SUPER_ADMIN role not found — check seedRoles()"));

        // Assign the Prabha Tech Head Office as the admin's default company.
        // This is required so that login returns a non-null companyId, which the
        // frontend puts in the X-Company-Id header. Without this the TenantContext
        // defaults to the public schema and employee queries return nothing.
        Company praabhaTechHO = companyRepository
                .findByOrganizationIdAndCompanyType(
                        organizationRepository.findBySlug("praabha-tech")
                                .map(org -> org.getId()).orElse(-1L),
                        Company.CompanyType.HEAD_OFFICE)
                .orElse(null);

        UserRole userRole = new UserRole();
        userRole.setUser(admin);
        userRole.setRole(platformAdminRole);
        userRole.setAccessScope(UserRole.AccessScope.ENTERPRISE);
        userRole.setCompany(praabhaTechHO); // gives the frontend a valid X-Company-Id to send
        userRoleRepository.save(userRole);

        log.info("Created Platform Super Admin: username=admin, password=admin123");
    }

    // ---------- Step 5: Sample client org with all roles filled ----------

    /**
     * Creates "Yuwa Tech Solutions" as a sample client organization with:
     *   - Head Office in Chennai
     *   - Bangalore Branch
     *   - Mumbai Branch
     *
     * Then creates one user per role, each properly assigned to the right company
     * with the correct AccessScope.
     *
     * Credentials follow the pattern:  username / Pass@123
     *
     *   enterprise.admin     / Pass@123  → ENTERPRISE_ADMIN,  Head Office,  ENTERPRISE scope
     *   branch.admin.blr     / Pass@123  → BRANCH_ADMIN,      Bangalore,    BRANCH scope
     *   branch.admin.mum     / Pass@123  → BRANCH_ADMIN,      Mumbai,       BRANCH scope
     *   hr.manager.ho        / Pass@123  → HR_MANAGER,        Head Office,  HEAD_OFFICE scope
     *   hr.manager.blr       / Pass@123  → HR_MANAGER,        Bangalore,    BRANCH scope
     *   accountant.ho        / Pass@123  → ACCOUNTANT,        Head Office,  HEAD_OFFICE scope
     *   accountant.blr       / Pass@123  → ACCOUNTANT,        Bangalore,    BRANCH scope
     *   dept.manager.mum     / Pass@123  → DEPARTMENT_MANAGER,Mumbai,       DEPARTMENT scope
     *   teamlead.blr         / Pass@123  → TEAM_LEAD,         Bangalore,    DEPARTMENT scope
     *   employee.ho          / Pass@123  → EMPLOYEE,          Head Office,  SELF scope
     *   employee.blr         / Pass@123  → EMPLOYEE,          Bangalore,    SELF scope
     *   employee.mum         / Pass@123  → EMPLOYEE,          Mumbai,       SELF scope
     */
    @Transactional
    private void seedSampleCompaniesAndUsers() {

        // ── 1. Organization ────────────────────────────────────────────────────
        Organization yuwa = organizationRepository.findBySlug("yuwa-tech-solutions")
                .orElseGet(() -> {
                    Organization org = new Organization();
                    org.setName("Yuwa Tech Solutions");
                    org.setSlug("yuwa-tech-solutions");
                    org.setContactEmail("admin@yuwatech.com");
                    org.setSubscriptionPlan(SubscriptionPlan.STANDARD);
                    org.setStatus(Organization.OrgStatus.ACTIVE);
                    Organization saved = organizationRepository.save(org);
                    log.info("Created sample organization: Yuwa Tech Solutions");
                    return saved;
                });

        // ── 2. Head Office (Chennai) ───────────────────────────────────────────
        Company headOffice = companyRepository
                .findByOrganizationIdAndCompanyType(yuwa.getId(), Company.CompanyType.HEAD_OFFICE)
                .orElseGet(() -> {
                    Company ho = new Company();
                    ho.setName("Yuwa Tech Head Office");
                    ho.setCompanyType(Company.CompanyType.HEAD_OFFICE);
                    ho.setStatus(Company.CompanyStatus.ACTIVE);
                    ho.setOrganization(yuwa);
                    ho.setBranchLimit(10);
                    ho.setEmail("headoffice@yuwatech.com");
                    ho.setPhone("+91-44-12345678");
                    ho.setAddress("150 Anna Salai");
                    ho.setCity("Chennai");
                    ho.setState("Tamil Nadu");
                    ho.setCountry("India");
                    ho.setZip("600002");
                    ho.setWebsite("https://yuwatech.com");
                    ho.setTaxId("AABCY1234F");
                    Company saved = companyRepository.save(ho);
                    log.info("Created Head Office: {} (ID: {})", saved.getName(), saved.getId());
                    return saved;
                });

        // Provision tenant schema for Yuwa Tech Head Office
        String yuwaSchema = SchemaProvisioningService.toSchemaName("yuwa_tech_solutions");
        if (headOffice.getSchemaName() == null) {
            headOffice.setSchemaName(yuwaSchema);
            companyRepository.save(headOffice);
        }
        try {
            schemaProvisioningService.provisionSchema(yuwaSchema);
        } catch (Exception e) {
            log.warn("Yuwa schema provisioning skipped (may already exist): {}", e.getMessage());
        }

        // ── 3. Bangalore Branch ────────────────────────────────────────────────
        Company bangaloreBranch = companyRepository.findByName("Yuwa Tech Bangalore")
                .orElseGet(() -> {
                    Company br = new Company();
                    br.setName("Yuwa Tech Bangalore");
                    br.setCompanyType(Company.CompanyType.BRANCH);
                    br.setStatus(Company.CompanyStatus.ACTIVE);
                    br.setOrganization(yuwa);
                    br.setParentCompany(headOffice);
                    br.setEmail("bangalore@yuwatech.com");
                    br.setPhone("+91-80-98765432");
                    br.setAddress("42 MG Road");
                    br.setCity("Bangalore");
                    br.setState("Karnataka");
                    br.setCountry("India");
                    br.setZip("560001");
                    Company saved = companyRepository.save(br);
                    log.info("Created branch: {} (ID: {})", saved.getName(), saved.getId());
                    return saved;
                });

        // ── 4. Mumbai Branch ───────────────────────────────────────────────────
        Company mumbaiBranch = companyRepository.findByName("Yuwa Tech Mumbai")
                .orElseGet(() -> {
                    Company br = new Company();
                    br.setName("Yuwa Tech Mumbai");
                    br.setCompanyType(Company.CompanyType.BRANCH);
                    br.setStatus(Company.CompanyStatus.ACTIVE);
                    br.setOrganization(yuwa);
                    br.setParentCompany(headOffice);
                    br.setEmail("mumbai@yuwatech.com");
                    br.setPhone("+91-22-56781234");
                    br.setAddress("78 Nariman Point");
                    br.setCity("Mumbai");
                    br.setState("Maharashtra");
                    br.setCountry("India");
                    br.setZip("400021");
                    Company saved = companyRepository.save(br);
                    log.info("Created branch: {} (ID: {})", saved.getName(), saved.getId());
                    return saved;
                });

        // ── 5. Fetch roles once ────────────────────────────────────────────────
        Role enterpriseAdminRole  = getRole(Role.RoleName.ENTERPRISE_ADMIN);
        Role branchAdminRole      = getRole(Role.RoleName.BRANCH_ADMIN);
        Role hrManagerRole        = getRole(Role.RoleName.HR_MANAGER);
        Role accountantRole       = getRole(Role.RoleName.ACCOUNTANT);
        Role deptManagerRole      = getRole(Role.RoleName.DEPARTMENT_MANAGER);
        Role teamLeadRole         = getRole(Role.RoleName.TEAM_LEAD);
        Role employeeRole         = getRole(Role.RoleName.EMPLOYEE);

        // ── 6. Create users ────────────────────────────────────────────────────
        //  ENTERPRISE ADMIN — Head Office, ENTERPRISE scope (sees all branches)
        createSampleUser("enterprise.admin", "Rajan",  "Mehta",
                "rajan.mehta@yuwatech.com", "Pass@123",
                enterpriseAdminRole, headOffice, UserRole.AccessScope.ENTERPRISE);

        //  BRANCH ADMIN — Bangalore, BRANCH scope
        createSampleUser("branch.admin.blr", "Priya",  "Suresh",
                "priya.suresh@yuwatech.com", "Pass@123",
                branchAdminRole, bangaloreBranch, UserRole.AccessScope.BRANCH);

        //  BRANCH ADMIN — Mumbai, BRANCH scope
        createSampleUser("branch.admin.mum", "Arjun",  "Nair",
                "arjun.nair@yuwatech.com", "Pass@123",
                branchAdminRole, mumbaiBranch, UserRole.AccessScope.BRANCH);

        //  HR MANAGER — Head Office level (sees all branches)
        createSampleUser("hr.manager.ho", "Meena",  "Krishnan",
                "meena.krishnan@yuwatech.com", "Pass@123",
                hrManagerRole, headOffice, UserRole.AccessScope.HEAD_OFFICE);

        //  HR MANAGER — Bangalore branch only
        createSampleUser("hr.manager.blr", "Divya",  "Rao",
                "divya.rao@yuwatech.com", "Pass@123",
                hrManagerRole, bangaloreBranch, UserRole.AccessScope.BRANCH);

        //  ACCOUNTANT — Head Office level (sees all branch payroll)
        createSampleUser("accountant.ho", "Suresh",  "Kumar",
                "suresh.kumar@yuwatech.com", "Pass@123",
                accountantRole, headOffice, UserRole.AccessScope.HEAD_OFFICE);

        //  ACCOUNTANT — Bangalore branch only
        createSampleUser("accountant.blr", "Kavitha",  "Devi",
                "kavitha.devi@yuwatech.com", "Pass@123",
                accountantRole, bangaloreBranch, UserRole.AccessScope.BRANCH);

        //  DEPARTMENT MANAGER — Mumbai branch, DEPARTMENT scope
        createSampleUser("dept.manager.mum", "Vikram",  "Singh",
                "vikram.singh@yuwatech.com", "Pass@123",
                deptManagerRole, mumbaiBranch, UserRole.AccessScope.DEPARTMENT);

        //  TEAM LEAD — Bangalore branch, DEPARTMENT scope
        createSampleUser("teamlead.blr", "Anita",  "Bose",
                "anita.bose@yuwatech.com", "Pass@123",
                teamLeadRole, bangaloreBranch, UserRole.AccessScope.DEPARTMENT);

        //  EMPLOYEE — Head Office, SELF scope
        createSampleUser("employee.ho", "Raj",  "Kumar",
                "raj.kumar@yuwatech.com", "Pass@123",
                employeeRole, headOffice, UserRole.AccessScope.SELF);

        //  EMPLOYEE — Bangalore, SELF scope
        createSampleUser("employee.blr", "Sneha",  "Patel",
                "sneha.patel@yuwatech.com", "Pass@123",
                employeeRole, bangaloreBranch, UserRole.AccessScope.SELF);

        //  EMPLOYEE — Mumbai, SELF scope
        createSampleUser("employee.mum", "Aditya",  "Sharma",
                "aditya.sharma@yuwatech.com", "Pass@123",
                employeeRole, mumbaiBranch, UserRole.AccessScope.SELF);

        log.info("Sample companies and users seeded for Yuwa Tech Solutions.");
    }

    /**
     * Creates a user + UserRole assignment if the username doesn't already exist.
     */
    private void createSampleUser(String username, String firstName, String lastName,
                                  String email, String rawPassword,
                                  Role role, Company company, UserRole.AccessScope scope) {
        if (userRepository.findByUsername(username).isPresent()) {
            return;
        }
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user = userRepository.save(user);

        UserRole ur = new UserRole();
        ur.setUser(user);
        ur.setRole(role);
        ur.setCompany(company);
        ur.setAccessScope(scope);
        userRoleRepository.save(ur);

        log.info("Created user: {} ({} {}) → role={}, company={}, scope={}",
                username, firstName, lastName, role.getName(), company.getName(), scope);
    }

    /**
     * Fetches a role by name, throwing a clear error if it's missing
     * (which means seedRoles() didn't run first).
     */
    private Role getRole(Role.RoleName name) {
        return roleRepository.findByName(name)
                .orElseThrow(() -> new RuntimeException("Role not found: " + name + " — check seedRoles()"));
    }

    // ---------- Step 6: Tenant-level data (departments, employees, etc.) ----------

    /**
     * Seeds departments, job positions, job roles, work types, shift schedules,
     * and employees into the yuwa_tech_solutions tenant schema.
     *
     * Must run AFTER seedSampleCompaniesAndUsers() so that the companies and
     * user accounts already exist.
     *
     * TenantContext is set to "yuwa_tech_solutions" so Hibernate routes all
     * INSERTs to that schema via search_path.
     */
    private void seedSampleTenantData() {
        // Fetch the three Yuwa Tech companies from the public schema
        Company headOffice = companyRepository.findByName("Yuwa Tech Head Office").orElse(null);
        Company blr        = companyRepository.findByName("Yuwa Tech Bangalore").orElse(null);
        Company mum        = companyRepository.findByName("Yuwa Tech Mumbai").orElse(null);

        if (headOffice == null) {
            log.warn("Yuwa Tech Head Office not found — skipping tenant data seeding. Run seedSampleCompaniesAndUsers first.");
            return;
        }

        // Point Hibernate at the yuwa_tech_solutions schema for all tenant writes
        TenantContext.setTenant("yuwa_tech_solutions");
        try {
            // ── Work types (one set per company) ──────────────────────────────
            WorkType remoteHO  = seedWorkType("Remote Work",  headOffice);
            WorkType officeHO  = seedWorkType("Office Work",  headOffice);
            WorkType hybridHO  = seedWorkType("Hybrid Work",  headOffice);

            WorkType remoteBLR = blr != null ? seedWorkType("Remote Work", blr) : null;
            WorkType officeBLR = blr != null ? seedWorkType("Office Work", blr) : null;

            WorkType remoteMUM = mum != null ? seedWorkType("Remote Work", mum) : null;
            WorkType officeMUM = mum != null ? seedWorkType("Office Work", mum) : null;

            // ── Shift schedules ───────────────────────────────────────────────
            ShiftSchedule morningHO  = seedShift("Morning Shift", LocalTime.of(9, 0),  LocalTime.of(18, 0), 8, headOffice);
            ShiftSchedule eveningHO  = seedShift("Evening Shift", LocalTime.of(14, 0), LocalTime.of(23, 0), 8, headOffice);

            ShiftSchedule morningBLR = blr != null ? seedShift("Morning Shift", LocalTime.of(9, 0),  LocalTime.of(18, 0), 8, blr) : null;
            ShiftSchedule morningMUM = mum != null ? seedShift("Morning Shift", LocalTime.of(9, 0),  LocalTime.of(18, 0), 8, mum) : null;

            // ── Departments ───────────────────────────────────────────────────
            Department engHO     = seedDepartment("Engineering",  headOffice);
            Department hrHO      = seedDepartment("Human Resources", headOffice);
            Department finHO     = seedDepartment("Finance",      headOffice);

            Department engBLR    = blr != null ? seedDepartment("Engineering",  blr) : null;
            Department opsBLR    = blr != null ? seedDepartment("Operations",   blr) : null;

            Department engMUM    = mum != null ? seedDepartment("Engineering",  mum) : null;
            Department mktMUM    = mum != null ? seedDepartment("Marketing",    mum) : null;

            // ── Job Positions ─────────────────────────────────────────────────
            JobPosition seniorEngHO  = seedJobPosition("Senior Software Engineer", engHO,  headOffice);
            JobPosition juniorEngHO  = seedJobPosition("Software Engineer",        engHO,  headOffice);
            JobPosition hrExecHO     = seedJobPosition("HR Manager",               hrHO,   headOffice);
            JobPosition finAnalystHO = seedJobPosition("Finance Manager",           finHO,  headOffice);

            JobPosition seniorEngBLR = (engBLR != null) ? seedJobPosition("Senior Software Engineer", engBLR, blr) : null;
            JobPosition opsExecBLR   = (opsBLR != null) ? seedJobPosition("Operations Executive",    opsBLR, blr) : null;

            JobPosition seniorEngMUM = (engMUM != null) ? seedJobPosition("Senior Software Engineer", engMUM, mum) : null;
            JobPosition mktExecMUM   = (mktMUM != null) ? seedJobPosition("Marketing Executive",     mktMUM, mum) : null;

            // ── Job Roles ─────────────────────────────────────────────────────
            JobRole backendHO  = seedJobRole("Backend Developer",  seniorEngHO, headOffice);
            JobRole frontendHO = seedJobRole("Frontend Developer", juniorEngHO, headOffice);
            JobRole hrRoleHO   = seedJobRole("HR Specialist",      hrExecHO,    headOffice);
            JobRole finRoleHO  = seedJobRole("Payroll Specialist",  finAnalystHO, headOffice);

            JobRole backendBLR = (seniorEngBLR != null) ? seedJobRole("Backend Developer",      seniorEngBLR, blr) : null;
            JobRole opsRoleBLR = (opsExecBLR   != null) ? seedJobRole("Operations Specialist",  opsExecBLR,   blr) : null;

            JobRole backendMUM = (seniorEngMUM != null) ? seedJobRole("Backend Developer",  seniorEngMUM, mum) : null;
            JobRole mktRoleMUM = (mktExecMUM  != null) ? seedJobRole("Digital Marketer",    mktExecMUM,   mum) : null;

            // ── Employees — one per seeded user account ────────────────────────
            // Head Office employees
            Employee rajanEmp = seedEmployee("EMP-HO-001", "Rajan",  "Mehta",
                    "rajan.mehta@yuwatech.com",  "+91-9000000001",
                    LocalDate.of(1985, 3, 12), Employee.Gender.MALE,
                    LocalDate.of(2018, 1, 15), Employee.EmployeeType.FULL_TIME,
                    headOffice, engHO, seniorEngHO, backendHO, hybridHO, morningHO,
                    "rajan.mehta");

            Employee meenaEmp = seedEmployee("EMP-HO-002", "Meena",  "Krishnan",
                    "meena.krishnan@yuwatech.com", "+91-9000000002",
                    LocalDate.of(1990, 7, 22), Employee.Gender.FEMALE,
                    LocalDate.of(2019, 4, 1), Employee.EmployeeType.FULL_TIME,
                    headOffice, hrHO, hrExecHO, hrRoleHO, officeHO, morningHO,
                    "hr.manager.ho");

            Employee sureshEmp = seedEmployee("EMP-HO-003", "Suresh", "Kumar",
                    "suresh.kumar@yuwatech.com",  "+91-9000000003",
                    LocalDate.of(1988, 11, 5), Employee.Gender.MALE,
                    LocalDate.of(2020, 6, 10), Employee.EmployeeType.FULL_TIME,
                    headOffice, finHO, finAnalystHO, finRoleHO, officeHO, morningHO,
                    "accountant.ho");

            Employee rajEmp = seedEmployee("EMP-HO-004", "Raj",    "Kumar",
                    "raj.kumar@yuwatech.com",      "+91-9000000004",
                    LocalDate.of(1996, 2, 28), Employee.Gender.MALE,
                    LocalDate.of(2022, 8, 1), Employee.EmployeeType.FULL_TIME,
                    headOffice, engHO, juniorEngHO, frontendHO, remoteHO, morningHO,
                    "employee.ho");

            // Set Rajan as enterprise admin employee (reporting manager = himself for now)
            // After all employees created, set reporting manager chains

            // Bangalore Branch employees
            Employee priyaEmp = (engBLR != null) ? seedEmployee("EMP-BLR-001", "Priya", "Suresh",
                    "priya.suresh@yuwatech.com",  "+91-9000000005",
                    LocalDate.of(1987, 5, 18), Employee.Gender.FEMALE,
                    LocalDate.of(2017, 3, 20), Employee.EmployeeType.FULL_TIME,
                    blr, engBLR, seniorEngBLR, backendBLR, officeBLR, morningBLR,
                    "branch.admin.blr") : null;

            Employee divyaEmp = (engBLR != null) ? seedEmployee("EMP-BLR-002", "Divya", "Rao",
                    "divya.rao@yuwatech.com",     "+91-9000000006",
                    LocalDate.of(1992, 9, 14), Employee.Gender.FEMALE,
                    LocalDate.of(2021, 2, 1), Employee.EmployeeType.FULL_TIME,
                    blr, engBLR, seniorEngBLR, backendBLR, remoteBLR, morningBLR,
                    "hr.manager.blr") : null;

            Employee kavithaEmp = (opsBLR != null) ? seedEmployee("EMP-BLR-003", "Kavitha", "Devi",
                    "kavitha.devi@yuwatech.com",  "+91-9000000007",
                    LocalDate.of(1991, 4, 30), Employee.Gender.FEMALE,
                    LocalDate.of(2020, 11, 15), Employee.EmployeeType.FULL_TIME,
                    blr, opsBLR, opsExecBLR, opsRoleBLR, officeBLR, morningBLR,
                    "accountant.blr") : null;

            Employee anitaEmp = (engBLR != null) ? seedEmployee("EMP-BLR-004", "Anita", "Bose",
                    "anita.bose@yuwatech.com",    "+91-9000000008",
                    LocalDate.of(1994, 12, 3), Employee.Gender.FEMALE,
                    LocalDate.of(2022, 5, 1), Employee.EmployeeType.FULL_TIME,
                    blr, engBLR, seniorEngBLR, backendBLR, remoteBLR, morningBLR,
                    "teamlead.blr") : null;

            Employee snehaEmp = (engBLR != null) ? seedEmployee("EMP-BLR-005", "Sneha", "Patel",
                    "sneha.patel@yuwatech.com",   "+91-9000000009",
                    LocalDate.of(1997, 6, 20), Employee.Gender.FEMALE,
                    LocalDate.of(2023, 1, 16), Employee.EmployeeType.FULL_TIME,
                    blr, engBLR, seniorEngBLR, backendBLR, remoteBLR, morningBLR,
                    "employee.blr") : null;

            // Mumbai Branch employees
            Employee arjunEmp = (engMUM != null) ? seedEmployee("EMP-MUM-001", "Arjun", "Nair",
                    "arjun.nair@yuwatech.com",    "+91-9000000010",
                    LocalDate.of(1986, 8, 9), Employee.Gender.MALE,
                    LocalDate.of(2016, 7, 1), Employee.EmployeeType.FULL_TIME,
                    mum, engMUM, seniorEngMUM, backendMUM, officeMUM, morningMUM,
                    "branch.admin.mum") : null;

            Employee vikramEmp = (mktMUM != null) ? seedEmployee("EMP-MUM-002", "Vikram", "Singh",
                    "vikram.singh@yuwatech.com",  "+91-9000000011",
                    LocalDate.of(1989, 1, 25), Employee.Gender.MALE,
                    LocalDate.of(2019, 9, 1), Employee.EmployeeType.FULL_TIME,
                    mum, mktMUM, mktExecMUM, mktRoleMUM, officeMUM, morningMUM,
                    "dept.manager.mum") : null;

            Employee adityaEmp = (engMUM != null) ? seedEmployee("EMP-MUM-003", "Aditya", "Sharma",
                    "aditya.sharma@yuwatech.com", "+91-9000000012",
                    LocalDate.of(1998, 3, 7), Employee.Gender.MALE,
                    LocalDate.of(2023, 6, 5), Employee.EmployeeType.FULL_TIME,
                    mum, engMUM, seniorEngMUM, backendMUM, remoteMUM, morningMUM,
                    "employee.mum") : null;

            // ── Reporting manager chains ──────────────────────────────────────
            // HO: Rajan manages Meena, Suresh, Raj
            setReportingManager(meenaEmp,  rajanEmp);
            setReportingManager(sureshEmp, rajanEmp);
            setReportingManager(rajEmp,    rajanEmp);

            // BLR: Priya manages Divya, Kavitha, Anita, Sneha
            if (priyaEmp != null) {
                setReportingManager(divyaEmp,  priyaEmp);
                setReportingManager(kavithaEmp, priyaEmp);
                setReportingManager(anitaEmp,  priyaEmp);
                setReportingManager(snehaEmp,  anitaEmp); // Sneha reports to Anita (team lead)
            }

            // MUM: Arjun manages Vikram, Aditya
            if (arjunEmp != null) {
                setReportingManager(vikramEmp, arjunEmp);
                setReportingManager(adityaEmp, arjunEmp);
            }

            // ── Leave types ───────────────────────────────────────────────────
            seedLeaveType("Annual Leave",   "#4CAF50", 21, LeaveType.PaymentType.PAID,
                    LeaveType.CarryforwardType.CARRYFORWARD, 10.0,
                    LeaveType.LeaveValidationType.MANAGER_VALIDATION, true, headOffice);
            seedLeaveType("Sick Leave",     "#F44336", 12, LeaveType.PaymentType.PAID,
                    LeaveType.CarryforwardType.NO_CARRYFORWARD, null,
                    LeaveType.LeaveValidationType.AUTOMATIC, true, headOffice);
            seedLeaveType("Casual Leave",   "#2196F3",  6, LeaveType.PaymentType.PAID,
                    LeaveType.CarryforwardType.NO_CARRYFORWARD, null,
                    LeaveType.LeaveValidationType.AUTOMATIC, true, headOffice);
            seedLeaveType("Maternity Leave","#E91E63",  180, LeaveType.PaymentType.PAID,
                    LeaveType.CarryforwardType.NO_CARRYFORWARD, null,
                    LeaveType.LeaveValidationType.HR_VALIDATION, true, headOffice);
            seedLeaveType("Paternity Leave","#9C27B0",  15, LeaveType.PaymentType.PAID,
                    LeaveType.CarryforwardType.NO_CARRYFORWARD, null,
                    LeaveType.LeaveValidationType.HR_VALIDATION, true, headOffice);
            seedLeaveType("Loss of Pay",    "#FF9800",  null, LeaveType.PaymentType.UNPAID,
                    LeaveType.CarryforwardType.NO_CARRYFORWARD, null,
                    LeaveType.LeaveValidationType.HR_VALIDATION, false, headOffice);

            if (blr != null) {
                seedLeaveType("Annual Leave",  "#4CAF50", 21, LeaveType.PaymentType.PAID,
                        LeaveType.CarryforwardType.CARRYFORWARD, 10.0,
                        LeaveType.LeaveValidationType.MANAGER_VALIDATION, true, blr);
                seedLeaveType("Sick Leave",    "#F44336", 12, LeaveType.PaymentType.PAID,
                        LeaveType.CarryforwardType.NO_CARRYFORWARD, null,
                        LeaveType.LeaveValidationType.AUTOMATIC, true, blr);
                seedLeaveType("Casual Leave",  "#2196F3",  6, LeaveType.PaymentType.PAID,
                        LeaveType.CarryforwardType.NO_CARRYFORWARD, null,
                        LeaveType.LeaveValidationType.AUTOMATIC, true, blr);
                seedLeaveType("Loss of Pay",   "#FF9800", null, LeaveType.PaymentType.UNPAID,
                        LeaveType.CarryforwardType.NO_CARRYFORWARD, null,
                        LeaveType.LeaveValidationType.HR_VALIDATION, false, blr);
            }

            if (mum != null) {
                seedLeaveType("Annual Leave",  "#4CAF50", 21, LeaveType.PaymentType.PAID,
                        LeaveType.CarryforwardType.CARRYFORWARD, 10.0,
                        LeaveType.LeaveValidationType.MANAGER_VALIDATION, true, mum);
                seedLeaveType("Sick Leave",    "#F44336", 12, LeaveType.PaymentType.PAID,
                        LeaveType.CarryforwardType.NO_CARRYFORWARD, null,
                        LeaveType.LeaveValidationType.AUTOMATIC, true, mum);
                seedLeaveType("Casual Leave",  "#2196F3",  6, LeaveType.PaymentType.PAID,
                        LeaveType.CarryforwardType.NO_CARRYFORWARD, null,
                        LeaveType.LeaveValidationType.AUTOMATIC, true, mum);
                seedLeaveType("Loss of Pay",   "#FF9800", null, LeaveType.PaymentType.UNPAID,
                        LeaveType.CarryforwardType.NO_CARRYFORWARD, null,
                        LeaveType.LeaveValidationType.HR_VALIDATION, false, mum);
            }

            // ── Leave allocations (2026) ──────────────────────────────────────
            int year = 2026;
            List<Employee> hoEmps = List.of(rajanEmp, meenaEmp, sureshEmp, rajEmp);
            for (Employee emp : hoEmps) {
                for (LeaveType lt : leaveTypeRepository.findByCompanyId(headOffice.getId())) {
                    if (lt.getTotalDays() != null) {
                        seedLeaveAllocation(emp, lt, lt.getTotalDays().doubleValue(), year, headOffice);
                    }
                }
            }
            if (blr != null) {
                List<Employee> blrEmps = java.util.Arrays.asList(priyaEmp, divyaEmp, kavithaEmp, anitaEmp, snehaEmp);
                for (Employee emp : blrEmps) {
                    if (emp == null) continue;
                    for (LeaveType lt : leaveTypeRepository.findByCompanyId(blr.getId())) {
                        if (lt.getTotalDays() != null) {
                            seedLeaveAllocation(emp, lt, lt.getTotalDays().doubleValue(), year, blr);
                        }
                    }
                }
            }
            if (mum != null) {
                List<Employee> mumEmps = java.util.Arrays.asList(arjunEmp, vikramEmp, adityaEmp);
                for (Employee emp : mumEmps) {
                    if (emp == null) continue;
                    for (LeaveType lt : leaveTypeRepository.findByCompanyId(mum.getId())) {
                        if (lt.getTotalDays() != null) {
                            seedLeaveAllocation(emp, lt, lt.getTotalDays().doubleValue(), year, mum);
                        }
                    }
                }
            }

            // ── Set department managers ───────────────────────────────────────
            setDepartmentManager(engHO,  rajanEmp);
            setDepartmentManager(hrHO,   meenaEmp);
            setDepartmentManager(finHO,  sureshEmp);
            if (engBLR  != null) setDepartmentManager(engBLR,  priyaEmp);
            if (opsBLR  != null) setDepartmentManager(opsBLR,  kavithaEmp);
            if (engMUM  != null) setDepartmentManager(engMUM,  arjunEmp);
            if (mktMUM  != null) setDepartmentManager(mktMUM,  vikramEmp);

            log.info("Tenant data seeded: departments, job positions, job roles, work types, shifts, employees, leave types, leave allocations.");
        } finally {
            TenantContext.clear();
        }
    }

    // ── Tenant seeding helpers ────────────────────────────────────────────────

    private WorkType seedWorkType(String name, Company company) {
        List<WorkType> existing = workTypeRepository.findByCompanyId(company.getId());
        return existing.stream()
                .filter(w -> w.getName().equals(name))
                .findFirst()
                .orElseGet(() -> {
                    WorkType wt = new WorkType();
                    wt.setName(name);
                    wt.setCompany(company);
                    return workTypeRepository.save(wt);
                });
    }

    private ShiftSchedule seedShift(String name, LocalTime start, LocalTime end, int minHours, Company company) {
        List<ShiftSchedule> existing = shiftScheduleRepository.findByCompanyId(company.getId());
        return existing.stream()
                .filter(s -> s.getName().equals(name))
                .findFirst()
                .orElseGet(() -> {
                    ShiftSchedule s = new ShiftSchedule();
                    s.setName(name);
                    s.setStartTime(start);
                    s.setEndTime(end);
                    s.setMinimumWorkingHour(minHours);
                    s.setFullTime(true);
                    s.setCompany(company);
                    return shiftScheduleRepository.save(s);
                });
    }

    private void seedLeaveType(String name, String colorCode, Integer totalDays,
                               LeaveType.PaymentType paymentType,
                               LeaveType.CarryforwardType carryforwardType, Double carryforwardMax,
                               LeaveType.LeaveValidationType validationType,
                               boolean excludeHoliday, Company company) {
        boolean exists = leaveTypeRepository.findByCompanyId(company.getId())
                .stream().anyMatch(lt -> lt.getName().equals(name));
        if (exists) return;
        LeaveType lt = new LeaveType();
        lt.setName(name);
        lt.setColorCode(colorCode);
        lt.setTotalDays(totalDays);
        lt.setPaymentType(paymentType);
        lt.setCarryforwardType(carryforwardType);
        lt.setCarryforwardMax(carryforwardMax);
        lt.setLeaveValidationType(validationType);
        lt.setExcludeHoliday(excludeHoliday);
        lt.setExcludeCompanyLeave(true);
        lt.setIsOrganizationWide(false);
        lt.setCompany(company);
        leaveTypeRepository.save(lt);
    }

    private void seedLeaveAllocation(Employee employee, LeaveType leaveType, double days, int year, Company company) {
        boolean exists = leaveAllocationRepository
                .findByEmployeeIdAndLeaveTypeIdAndYear(employee.getId(), leaveType.getId(), year)
                .isPresent();
        if (exists) return;
        LeaveAllocation a = new LeaveAllocation();
        a.setEmployee(employee);
        a.setLeaveType(leaveType);
        a.setTotalLeaveDays(days);
        a.setAvailableDays(days);
        a.setCarryforwardDays(0.0);
        a.setYear(year);
        a.setStatus(LeaveAllocation.AllocationStatus.ACTIVE);
        a.setCompany(company);
        leaveAllocationRepository.save(a);
    }

    private Department seedDepartment(String name, Company company) {
        List<Department> existing = departmentRepository.findByCompanyId(company.getId());
        return existing.stream()
                .filter(d -> d.getName().equals(name))
                .findFirst()
                .orElseGet(() -> {
                    Department d = new Department();
                    d.setName(name);
                    d.setCompany(company);
                    return departmentRepository.save(d);
                });
    }

    private JobPosition seedJobPosition(String name, Department department, Company company) {
        List<JobPosition> existing = jobPositionRepository.findByDepartmentId(department.getId());
        return existing.stream()
                .filter(p -> p.getName().equals(name))
                .findFirst()
                .orElseGet(() -> {
                    JobPosition p = new JobPosition();
                    p.setName(name);
                    p.setDepartment(department);
                    p.setCompany(company);
                    return jobPositionRepository.save(p);
                });
    }

    private JobRole seedJobRole(String name, JobPosition position, Company company) {
        List<JobRole> existing = jobRoleRepository.findByJobPositionId(position.getId());
        return existing.stream()
                .filter(r -> r.getName().equals(name))
                .findFirst()
                .orElseGet(() -> {
                    JobRole r = new JobRole();
                    r.setName(name);
                    r.setJobPosition(position);
                    r.setCompany(company);
                    return jobRoleRepository.save(r);
                });
    }

    private Employee seedEmployee(String badgeId, String firstName, String lastName,
                                  String email, String phone,
                                  LocalDate dob, Employee.Gender gender,
                                  LocalDate dateJoining, Employee.EmployeeType type,
                                  Company company, Department department,
                                  JobPosition jobPosition, JobRole jobRole,
                                  WorkType workType, ShiftSchedule shift,
                                  String linkedUsername) {
        return employeeRepository.findByBadgeId(badgeId).orElseGet(() -> {
            Employee e = new Employee();
            e.setBadgeId(badgeId);
            e.setFirstName(firstName);
            e.setLastName(lastName);
            e.setEmail(email);
            e.setPhone(phone);
            e.setDateOfBirth(dob);
            e.setGender(gender);
            e.setDateJoining(dateJoining);
            e.setEmployeeType(type);
            e.setNationality("Indian");
            e.setCountry("India");
            e.setMaritalStatus(Employee.MaritalStatus.SINGLE);
            e.setCompany(company);
            e.setDepartment(department);
            e.setJobPosition(jobPosition);
            e.setJobRole(jobRole);
            e.setWorkType(workType);
            e.setShift(shift);
            // Link to the User account created in seedSampleCompaniesAndUsers
            userRepository.findByUsername(linkedUsername)
                    .ifPresent(e::setUser);
            Employee saved = employeeRepository.save(e);
            log.info("Created employee: {} {} ({})", firstName, lastName, badgeId);
            return saved;
        });
    }

    private void setReportingManager(Employee employee, Employee manager) {
        if (employee == null || manager == null) return;
        if (employee.getReportingManager() != null) return; // already set
        employee.setReportingManager(manager);
        employeeRepository.save(employee);
    }

    private void setDepartmentManager(Department department, Employee manager) {
        if (department == null || manager == null) return;
        if (department.getManager() != null) return; // already set
        department.setManager(manager);
        departmentRepository.save(department);
    }

    // ---------- Helpers ----------

    private void createRole(Role.RoleName name, String displayName, String description, Permission[] permissions) {
        if (roleRepository.findByName(name).isPresent()) {
            return; // Already exists
        }
        Role role = new Role();
        role.setName(name);
        role.setDisplayName(displayName);
        role.setDescription(description);
        role.setPermissions(new HashSet<>(Arrays.asList(permissions)));
        roleRepository.save(role);
        log.info("Created role: {} ({})", name, displayName);
    }

    /** Returns all permissions in the system */
    private Permission[] allPermissions(Map<String, Permission> all) {
        return all.values().toArray(new Permission[0]);
    }

    /** Returns only the specified permissions by name */
    private Permission[] perms(Map<String, Permission> all, String... names) {
        return Arrays.stream(names)
                .map(all::get)
                .filter(Objects::nonNull)
                .toArray(Permission[]::new);
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
