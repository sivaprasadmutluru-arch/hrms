package com.example.demo.common.seeder;

import com.example.demo.auth.entity.Permission;
import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.PermissionRepository;
import com.example.demo.auth.repository.RoleRepository;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import com.example.demo.base.enums.SubscriptionPlan;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.OrganizationRepository;
import com.example.demo.common.tenant.SchemaProvisioningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;

/**
 * Runs on application startup in ALL profiles (including production) to ensure:
 *   1. All system permissions exist.
 *   2. All canonical system roles are seeded with appropriate permission sets.
 *   3. The platform organization ('AccrueHr') and default Head Office exist.
 *   4. A platform super administrator user exists if none is present.
 *
 * This runner is strictly idempotent and safe to run on every startup.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class CatalogBootstrapRunner implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final OrganizationRepository organizationRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;
    private final SchemaProvisioningService schemaProvisioningService;

    // All module permissions: module name -> allowed actions
    private static final Map<String, String[]> MODULE_PERMISSIONS = new LinkedHashMap<>();

    static {
        MODULE_PERMISSIONS.put("employee",     new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("attendance",   new String[]{"view", "create", "edit", "delete", "approve"});
        MODULE_PERMISSIONS.put("leave",        new String[]{"view", "create", "edit", "delete", "approve", "manage"});
        MODULE_PERMISSIONS.put("payroll",      new String[]{"view", "create", "edit", "delete", "approve"});
        MODULE_PERMISSIONS.put("recruitment",  new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("onboarding",   new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("offboarding",  new String[]{"view", "create", "edit", "delete", "approve"});
        MODULE_PERMISSIONS.put("pms",          new String[]{"view", "create", "edit", "delete", "approve"});
        MODULE_PERMISSIONS.put("asset",        new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("helpdesk",     new String[]{"view", "create", "edit", "delete", "approve"});
        MODULE_PERMISSIONS.put("announcements",new String[]{"view"});
        MODULE_PERMISSIONS.put("project",      new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("company",      new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("department",   new String[]{"view", "create", "edit", "delete"});
        MODULE_PERMISSIONS.put("documents",    new String[]{"view", "create", "edit", "delete", "approve"});
        MODULE_PERMISSIONS.put("report",       new String[]{"view", "export"});
        MODULE_PERMISSIONS.put("organization", new String[]{"view", "create", "edit", "delete"});
    }

    @Override
    public void run(String... args) {
        log.info("[CatalogBootstrap] Initializing core permissions, roles, and platform administrator...");
        seedPermissions();
        seedRoles();
        seedDefaultOrganizationAndCompany();
        seedPlatformSuperAdmin();
        log.info("[CatalogBootstrap] Core catalog bootstrap complete.");
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
        log.info("[CatalogBootstrap] Permissions verified/seeded.");
    }

    // ---------- Step 2: Roles ----------

    private void seedRoles() {
        Map<String, Permission> all = new HashMap<>();
        permissionRepository.findAll().forEach(p -> all.put(p.getName(), p));

        createRole(Role.RoleName.SUPER_ADMIN, "Super Admin",
                "Platform administration; confidential customer access requires explicit audited support access",
                allPermissions(all));
        createRole(Role.RoleName.ACCOUNT_MANAGER, "Account Manager",
                "Standing operational access to explicitly assigned customer companies and all their branches",
                excludingModules(all, Set.of("organization")));
        createRole(Role.RoleName.COMPANY_ADMIN, "Company Admin",
                "Company administration within delegated permissions",
                excludingModules(all, Set.of("organization")));
        createRole(Role.RoleName.CEO, "Chief Executive Officer",
                "Executive company-wide access to the assigned Head Office and all of its branches",
                allPermissions(all));
        createRole(Role.RoleName.COMPANY_MANAGER, "Company Manager",
                "Company operations and designated approvals without unrestricted role administration",
                perms(all, "employee:view", "attendance:view", "attendance:approve", "leave:view", "leave:approve",
                        "recruitment:view", "recruitment:create", "pms:view", "pms:create", "report:view", "report:export"));
        createRole(Role.RoleName.ACCOUNTS_MANAGER, "Accounts Manager",
                "Payroll and employee finance within assigned scope",
                perms(all, "employee:view", "attendance:view", "leave:view", "payroll:view", "payroll:create",
                        "payroll:edit", "payroll:approve", "report:view", "report:export"));

        /*
         * PLATFORM_SUPER_ADMIN — AccrueHr internal admin
         * Has all permissions. Manages organizations and companies.
         */
        createRole(Role.RoleName.PLATFORM_SUPER_ADMIN,
                "Platform Super Admin",
                "AccrueHr internal — manages all client organizations",
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
                        "asset:view", "asset:create", "asset:edit", "asset:delete",
                        "documents:view", "documents:create", "documents:edit", "documents:delete", "documents:approve",
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
                        "documents:view", "documents:create", "documents:edit", "documents:delete", "documents:approve",
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
                "Department Manager (Supervisor)",
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
                "Employee",
                "Self-service: own profile, leave, attendance, payslip",
                perms(all,
                        "attendance:view", "attendance:create",
                        "leave:view", "leave:create",
                        "payroll:view",
                        "documents:view", "documents:create",
                        "helpdesk:view", "helpdesk:create",
                        "pms:view"));

        log.info("[CatalogBootstrap] Canonical and compatibility roles verified/seeded.");
    }

    // ---------- Step 3: Default Organization and Head Office ----------

    private void seedDefaultOrganizationAndCompany() {
        // Existing installations may use their own operator organization name/slug.
        // A startup must not add a second platform organization to such installations.
        if (organizationRepository.findBySlug("accruehr").isEmpty() && organizationRepository.count() > 0) {
            log.info("[CatalogBootstrap] Existing organizations retained; default organization bootstrap skipped.");
            return;
        }
        // Create AccrueHr organization (the platform owner)
        Organization platformOrganization = organizationRepository.findBySlug("accruehr")
                .orElseGet(() -> {
                    Organization org = new Organization();
                    org.setName("AccrueHRMS");
                    org.setSlug("accruehr");
                    org.setContactEmail("hr@accruetechnologies.com");
                    org.setSubscriptionPlan(SubscriptionPlan.ENTERPRISE);
                    org.setStatus(Organization.OrgStatus.ACTIVE);
                    Organization saved = organizationRepository.save(org);
                    log.info("[CatalogBootstrap] Created default organization: AccrueHRMS");
                    return saved;
                });

        // Create default Head Office under AccrueHRMS
        Company headOffice = companyRepository.findByOrganizationIdAndCompanyType(platformOrganization.getId(), Company.CompanyType.HEAD_OFFICE)
                .orElseGet(() -> {
                    Company ho = new Company();
                    ho.setName("AccrueHRMS Head Office");
                    ho.setCompanyType(Company.CompanyType.HEAD_OFFICE);
                    ho.setStatus(Company.CompanyStatus.ACTIVE);
                    ho.setOrganization(platformOrganization);
                    ho.setBranchLimit(5);
                    ho.setEmail("hr@accruetechnologies.com");
                    Company saved = companyRepository.save(ho);
                    log.info("[CatalogBootstrap] Created default Head Office: AccrueHRMS Head Office (ID: {})", saved.getId());
                    return saved;
                });

        // Provision tenant schema for the AccrueHr Head Office (idempotent)
        String schemaName = SchemaProvisioningService.toSchemaName("accruehr");
        if (headOffice.getSchemaName() == null) {
            headOffice.setSchemaName(schemaName);
            companyRepository.save(headOffice);
        }
        try {
            schemaProvisioningService.provisionSchema(schemaName);
        } catch (Exception e) {
            log.warn("[CatalogBootstrap] Schema provisioning skipped (may already exist): {}", e.getMessage());
        }
    }

    // ---------- Step 4: Platform Super Admin user ----------

    private void seedPlatformSuperAdmin() {
        // Bootstrap only when no usable platform administrator exists.
        if (userRoleRepository.hasUsablePlatformAdministrator(Role.RoleName.PLATFORM_SUPER_ADMIN,
                UserRole.AssignmentStatus.ACTIVE, LocalDate.now())) {
            return;
        }
        if (userRepository.findByUsername("admin").isPresent()) {
            return; // Already seeded
        }

        User admin = new User();
        admin.setUsername("admin");
        admin.setEmail("accruetechnologiesai@gmail.com");
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setFirstName("Platform");
        admin.setLastName("Admin");
        admin.setSuperuser(true);
        admin = userRepository.save(admin);

        Role platformAdminRole = roleRepository.findByName(Role.RoleName.PLATFORM_SUPER_ADMIN)
                .orElseThrow(() -> new RuntimeException("PLATFORM_SUPER_ADMIN role not found — check seedRoles()"));

        // Platform grants must survive deletion of any tenant organization.
        UserRole userRole = new UserRole();
        userRole.setUser(admin);
        userRole.setRole(platformAdminRole);
        userRole.setAccessScope(UserRole.AccessScope.ENTERPRISE);
        userRole.setCompany(null);
        userRoleRepository.save(userRole);

        log.info("[CatalogBootstrap] Created default Platform Super Admin: username=admin");
    }

    // ---------- Helpers ----------

    private void createRole(Role.RoleName name, String displayName, String description, Permission[] permissions) {
        Role role = roleRepository.findByName(name).orElseGet(() -> {
            Role r = new Role();
            r.setName(name);
            log.info("[CatalogBootstrap] Created role: {} ({})", name, displayName);
            return r;
        });
        role.setDisplayName(displayName);
        role.setDescription(description);
        role.setPermissions(new HashSet<>(Arrays.asList(permissions)));
        roleRepository.save(role);
    }

    private Permission[] allPermissions(Map<String, Permission> all) {
        return all.values().toArray(new Permission[0]);
    }

    private Permission[] perms(Map<String, Permission> all, String... names) {
        return Arrays.stream(names)
                .map(all::get)
                .filter(Objects::nonNull)
                .toArray(Permission[]::new);
    }

    private Permission[] excludingModules(Map<String, Permission> all, Set<String> excludedModules) {
        return all.values().stream()
                .filter(permission -> !excludedModules.contains(permission.getModule()))
                .toArray(Permission[]::new);
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
