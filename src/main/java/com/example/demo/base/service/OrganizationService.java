package com.example.demo.base.service;

import com.example.demo.auth.entity.UserGroup;
import com.example.demo.auth.repository.CrossBranchAccessGrantRepository;
import com.example.demo.auth.repository.UserGroupRepository;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.base.dto.CompanyRequest;
import com.example.demo.base.dto.CreateOrganizationRequest;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import com.example.demo.base.enums.SubscriptionPlan;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.OrganizationRepository;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.service.FileUploadService;
import com.example.demo.common.tenant.SchemaProvisioningService;
import com.example.demo.employee.repository.EmployeeRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Business logic for managing client organizations on the Prabha Tech platform.
 * Follows the same pattern as CompanyService — controller delegates here.
 */
@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final FileUploadService fileUploadService;
    private final UserRoleRepository userRoleRepository;
    private final UserGroupRepository userGroupRepository;
    private final UserRepository userRepository;
    private final CrossBranchAccessGrantRepository crossBranchAccessGrantRepository;
    private final CompanyService companyService;
    private final SchemaProvisioningService schemaProvisioningService;

    public OrganizationService(OrganizationRepository organizationRepository,
                                CompanyRepository companyRepository,
                                EmployeeRepository employeeRepository,
                                FileUploadService fileUploadService,
                                UserRoleRepository userRoleRepository,
                                UserGroupRepository userGroupRepository,
                                UserRepository userRepository,
                                CrossBranchAccessGrantRepository crossBranchAccessGrantRepository,
                                @Lazy CompanyService companyService,
                                SchemaProvisioningService schemaProvisioningService) {
        this.organizationRepository = organizationRepository;
        this.companyRepository = companyRepository;
        this.employeeRepository = employeeRepository;
        this.fileUploadService = fileUploadService;
        this.userRoleRepository = userRoleRepository;
        this.userGroupRepository = userGroupRepository;
        this.userRepository = userRepository;
        this.crossBranchAccessGrantRepository = crossBranchAccessGrantRepository;
        this.companyService = companyService;
        this.schemaProvisioningService = schemaProvisioningService;
    }

    // Self-reference so deleteOrganization can call @Transactional sub-methods through the proxy
    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private OrganizationService self;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public Organization uploadLogo(Long id, MultipartFile file) {
        Organization org = getOrganizationById(id);
        if (org.getLogoPath() != null) fileUploadService.delete(org.getLogoPath());
        String path = fileUploadService.storeOrgScoped(file, org.getSlug(), "logos");
        org.setLogoPath(path);
        return organizationRepository.save(org);
    }

    public List<Organization> getAllOrganizations() {
        return organizationRepository.findAll();
    }

    public Organization getOrganizationById(Long id) {
        return organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", id));
    }

    public List<Organization> getOrganizationsWithoutHeadOffice() {
        return organizationRepository.findWithoutHeadOffice();
    }

    @Transactional
    public Organization createOrganization(CreateOrganizationRequest request) {
        Organization organization = new Organization();
        organization.setName(request.getName());
        organization.setContactEmail(request.getContactEmail());
        organization.setContactPhone(request.getContactPhone());
        organization.setSubscriptionPlan(
                request.getSubscriptionPlan() != null ? request.getSubscriptionPlan() : SubscriptionPlan.STANDARD);
        organization.setStatus(Organization.OrgStatus.ACTIVE);
        if (request.getMaxBranches() != null) {
            organization.setMaxBranches(request.getMaxBranches());
        }

        // Auto-generate slug from name if not provided
        String baseSlug = (request.getSlug() != null && !request.getSlug().isBlank())
                ? request.getSlug()
                : request.getName().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        String slug = baseSlug;
        int i = 1;
        while (organizationRepository.findBySlug(slug).isPresent()) {
            slug = baseSlug + "-" + i++;
        }
        organization.setSlug(slug);

        Organization savedOrg = organizationRepository.save(organization);

        // Auto-create the Head Office for this organization
        CompanyRequest hoRequest = new CompanyRequest();
        hoRequest.setName(request.getHeadOfficeName() != null && !request.getHeadOfficeName().isBlank()
                ? request.getHeadOfficeName() : request.getName());
        hoRequest.setOrganizationId(savedOrg.getId());
        hoRequest.setAddress(request.getAddress());
        hoRequest.setCity(request.getCity());
        hoRequest.setState(request.getState());
        hoRequest.setCountry(request.getCountry());
        hoRequest.setZip(request.getZip());
        hoRequest.setPhone(request.getPhone());
        hoRequest.setEmail(request.getEmail());
        hoRequest.setWebsite(request.getWebsite());
        hoRequest.setTaxId(request.getTaxId());
        hoRequest.setRegistrationNumber(request.getRegistrationNumber());
        hoRequest.setBranchLimit(request.getBranchLimit());
        hoRequest.setAdminUsername(request.getAdminUsername());
        hoRequest.setAdminEmail(request.getAdminEmail());
        hoRequest.setAdminPassword(request.getAdminPassword());
        hoRequest.setAdminFirstName(request.getAdminFirstName());
        hoRequest.setAdminLastName(request.getAdminLastName());

        companyService.createHeadOffice(hoRequest);

        return savedOrg;
    }

    @Transactional
    public Organization updateOrganization(Long id, Organization updated) {
        Organization org = getOrganizationById(id);

        // Validate plan downgrade won't violate current usage
        SubscriptionPlan newPlan = updated.getSubscriptionPlan() != null
                ? updated.getSubscriptionPlan()
                : org.getSubscriptionPlan();

        if (newPlan != org.getSubscriptionPlan()) {
            validatePlanDowngrade(org, newPlan);
        }

        org.setName(updated.getName());
        org.setContactEmail(updated.getContactEmail());
        org.setContactPhone(updated.getContactPhone());
        org.setSubscriptionPlan(newPlan);
        if (updated.getMaxBranches() != null) {
            org.setMaxBranches(updated.getMaxBranches());
        }
        return organizationRepository.save(org);
    }

    @Transactional
    public void activateOrganization(Long id) {
        Organization org = getOrganizationById(id);
        org.setStatus(Organization.OrgStatus.ACTIVE);
        organizationRepository.save(org);
        // Cascade: activate all companies under this org
        companyRepository.findByOrganizationId(id).forEach(company -> {
            company.setStatus(Company.CompanyStatus.ACTIVE);
            company.setActive(true);
            companyRepository.save(company);
        });
    }

    @Transactional
    public void suspendOrganization(Long id) {
        Organization org = getOrganizationById(id);
        org.setStatus(Organization.OrgStatus.SUSPENDED);
        organizationRepository.save(org);
        // Cascade: suspend all companies under this org
        companyRepository.findByOrganizationId(id).forEach(company -> {
            company.setStatus(Company.CompanyStatus.SUSPENDED);
            company.setActive(false);
            companyRepository.save(company);
        });
    }

    /**
     * Deletes an organization and all its data.
     *
     * Intentionally NOT @Transactional. Correct execution order is critical:
     *
     *  1. cleanupTenantDataForCompanies — removes rows from the TENANT schema
     *     (employees, leave, attendance, etc.).  This MUST happen before step 3
     *     because tenant-schema employees have a FK: employees.company_id → public.companies.id.
     *     Skipping this causes a FK violation when JPA tries to delete the company rows.
     *
     *  2. cleanupPublicSchemaDataForCompanies — removes rows from the PUBLIC schema
     *     (contracts, payslips, etc.) that also FK to public.companies.
     *
     *  3. deleteOrgPublicRecords — JPA transaction: deletes companies + org rows.
     *     By now all FK dependents are gone, so this succeeds cleanly.
     *
     *  4. dropSchemaAsync — fire-and-forget background DROP SCHEMA CASCADE.
     *     The tenant schema is already mostly empty after step 1, so this
     *     completes in milliseconds rather than the usual 5-15 s.
     */
    public void deleteOrganization(Long id) {
        Organization org = getOrganizationById(id);
        List<Company> companies = companyRepository.findByOrganizationId(id);

        List<Long> companyIds = companies.stream().map(Company::getId).toList();

        // Collect distinct schema names (one per head office) for tenant cleanup + drop.
        List<String> schemas = companies.stream()
                .filter(Company::isHeadOffice)
                .map(Company::getSchemaName)
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .toList();

        // Step 1: DROP the tenant schema(s) synchronously via CASCADE.
        // This is a single SQL statement that removes the entire tenant schema — including
        // tenant-schema employees which hold a cross-schema FK:
        //   {tenant}.employees.company_id → public.companies.id
        // Dropping the schema also drops that FK constraint, so public.companies rows
        // can be deleted freely in step 3.  DROP SCHEMA CASCADE on a small/test schema
        // takes < 1 s; it is always faster than row-by-row JDBC cleanup.
        schemas.forEach(schemaProvisioningService::dropSchema);

        // Step 1b: Nullify company_id in employees of OTHER tenant schemas that still
        // reference these company IDs.  These are cross-org FK references — e.g. a row
        // created via test data or an import that points to a company in another org.
        // The org's OWN schemas were just dropped above (Step 1).  Any remaining
        // sibling-schema employees would block the public.companies DELETE below.
        if (!companyIds.isEmpty()) {
            schemaProvisioningService.nullifyCrossSchemaEmployeeReferences(companyIds, schemas);
        }

        // Step 2: Delete public-schema rows (contracts, payslips, etc.) that FK to companies.
        if (!companyIds.isEmpty()) {
            schemaProvisioningService.cleanupPublicSchemaDataForCompanies(companyIds);
        }

        // Step 3: Delete companies and org in one short JPA transaction.
        // Both the tenant FK (gone with the schema drop) and the public FK dependents
        // (gone from step 2) are clear, so this now succeeds without constraint violations.
        self.deleteOrgPublicRecords(id, companies, org.getLogoPath());
    }

    /**
     * Transactional cleanup of all public-schema rows belonging to the org.
     * Called from deleteOrganization after tenant schemas have already been dropped.
     */
    @Transactional
    public void deleteOrgPublicRecords(Long id, List<Company> companies, String logoPath) {
        if (!companies.isEmpty()) {
            List<Long> companyIds = companies.stream().map(Company::getId).collect(Collectors.toList());

            crossBranchAccessGrantRepository.deleteAllInBatch(
                    crossBranchAccessGrantRepository.findByCompanyIds(companyIds));

            var groups = userGroupRepository.findByCompanyIdIn(companyIds);
            groups.forEach(g -> g.setCompany(null));
            userGroupRepository.saveAll(groups);

            // Collect user IDs before deleting roles so we can clean up orphaned users after.
            var rolesToDelete = userRoleRepository.findByCompanyIdIn(companyIds);
            List<Long> affectedUserIds = rolesToDelete.stream()
                    .map(r -> r.getUser().getId())
                    .distinct()
                    .collect(Collectors.toList());
            userRoleRepository.deleteAllInBatch(rolesToDelete);

            // Delete users that now have no remaining roles anywhere and are not superusers.
            // These are accounts that belonged exclusively to this org.
            if (!affectedUserIds.isEmpty()) {
                List<Long> orphanUserIds = affectedUserIds.stream()
                        .filter(uid -> userRoleRepository.findByUserId(uid).isEmpty())
                        .collect(Collectors.toList());
                orphanUserIds.forEach(uid ->
                        userRepository.findById(uid).ifPresent(u -> {
                            if (!u.isSuperuser()) {
                                userRepository.delete(u);
                            }
                        }));
            }

            // Delete branches first (FK to head office), then head offices.
            List<Company> branches = companies.stream().filter(Company::isBranch).collect(Collectors.toList());
            List<Company> headOffices = companies.stream().filter(Company::isHeadOffice).collect(Collectors.toList());
            companyRepository.deleteAllInBatch(branches);
            companyRepository.deleteAllInBatch(headOffices);

            entityManager.clear();
        }

        if (logoPath != null) {
            fileUploadService.delete(logoPath);
        }
        organizationRepository.deleteById(id);
    }

    /** Updates the subscription plan for an organization. Only PLATFORM_SUPER_ADMIN should call this. */
    @Transactional
    public Organization updateSubscriptionPlan(Long id, SubscriptionPlan plan) {
        Organization org = getOrganizationById(id);
        org.setSubscriptionPlan(plan);
        return organizationRepository.save(org);
    }

    /** Stats snapshot for a given organization. */
    public Map<String, Object> getOrganizationStats(Long id) {
        Organization org = getOrganizationById(id);

        Optional<Company> headOffice = companyRepository
                .findByOrganizationIdAndCompanyType(id, Company.CompanyType.HEAD_OFFICE);

        long branchCount = headOffice
                .map(ho -> companyRepository.countByParentCompanyIdAndIsActiveTrue(ho.getId()))
                .orElse(0L);

        List<Company> companies = companyRepository.findByOrganizationId(id);
        long employeeCount = companies.stream()
                .mapToLong(c -> employeeRepository.findByCompanyIdAndIsActiveTrue(c.getId()).size())
                .sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("organizationId", org.getId());
        stats.put("organizationName", org.getName());
        stats.put("subscriptionPlan", org.getSubscriptionPlan());
        stats.put("branchCount", branchCount);
        stats.put("employeeCount", employeeCount);
        stats.put("status", org.getStatus());
        return stats;
    }

    /** Current plan + usage vs limits for the frontend subscription page. */
    public Map<String, Object> getPlanLimits(Long id) {
        Organization org = getOrganizationById(id);
        SubscriptionPlan plan = org.getSubscriptionPlan() != null
                ? org.getSubscriptionPlan()
                : SubscriptionPlan.STANDARD;

        Optional<Company> headOffice = companyRepository
                .findByOrganizationIdAndCompanyType(id, Company.CompanyType.HEAD_OFFICE);

        long currentBranches = headOffice
                .map(ho -> companyRepository.countByParentCompanyIdAndIsActiveTrue(ho.getId()))
                .orElse(0L);

        List<Company> companies = companyRepository.findByOrganizationId(id);
        long currentEmployees = companies.stream()
                .mapToLong(c -> employeeRepository.findByCompanyIdAndIsActiveTrue(c.getId()).size())
                .sum();

        Map<String, Object> result = new HashMap<>();
        result.put("plan", plan.name());
        result.put("maxBranches", plan.getMaxBranches() == Integer.MAX_VALUE ? null : plan.getMaxBranches());
        result.put("maxEmployees", plan.getMaxEmployees() == Integer.MAX_VALUE ? null : plan.getMaxEmployees());
        result.put("crossBranchAccessAllowed", plan.isCrossBranchAccessAllowed());
        result.put("currentBranches", currentBranches);
        result.put("currentEmployees", currentEmployees);
        return result;
    }

    /** Lists HEAD_OFFICE companies that have no organization linked (directly inserted into DB). */
    public List<Company> getOrphanCompanies() {
        return companyRepository.findAllOrphanCompaniesPublic().stream()
                .filter(Company::isHeadOffice)
                .collect(Collectors.toList());
    }

    /**
     * Auto-provisions an organization and (if missing) a tenant schema for a company
     * that was directly inserted into the database without going through the normal
     * organization-creation flow.
     *
     * Steps:
     *  1. If the company already has an org, skip org creation.
     *  2. Create an Organization with the company's name.
     *  3. Link the company to the new org.
     *  4. If the company has no schemaName, generate one and provision the schema.
     */
    @Transactional
    public Map<String, Object> provisionOrganizationForCompany(Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));

        Map<String, Object> result = new HashMap<>();
        result.put("companyId", companyId);
        result.put("companyName", company.getName());

        // Step 1 — create org if missing
        if (company.getOrganization() == null) {
            Organization org = new Organization();
            org.setName(company.getName());
            org.setStatus(Organization.OrgStatus.ACTIVE);
            org.setSubscriptionPlan(SubscriptionPlan.STANDARD);
            String baseSlug = company.getName().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
            String slug = baseSlug;
            int i = 1;
            while (organizationRepository.findBySlug(slug).isPresent()) {
                slug = baseSlug + "-" + i++;
            }
            org.setSlug(slug);
            Organization savedOrg = organizationRepository.save(org);
            company.setOrganization(savedOrg);
            result.put("orgCreated", true);
            result.put("orgId", savedOrg.getId());
        } else {
            result.put("orgCreated", false);
            result.put("orgId", company.getOrganization().getId());
        }

        // Step 2 — provision schema if missing
        if (company.getSchemaName() == null || company.getSchemaName().isBlank()) {
            String baseSchema = SchemaProvisioningService.toSchemaName(company.getName());
            // Ensure uniqueness — can't use mutable var in lambda, so collect existing names first
            java.util.Set<String> existingSchemas = companyRepository.findAll().stream()
                    .map(Company::getSchemaName)
                    .filter(s -> s != null && !s.isBlank())
                    .collect(java.util.stream.Collectors.toSet());
            String candidate = baseSchema;
            int i = 1;
            while (existingSchemas.contains(candidate)) {
                candidate = baseSchema + "_" + i++;
            }
            company.setSchemaName(candidate);
            schemaProvisioningService.provisionSchema(candidate);
            result.put("schemaProvisioned", true);
            result.put("schemaName", candidate);
        } else {
            result.put("schemaProvisioned", false);
            result.put("schemaName", company.getSchemaName());
        }

        companyRepository.save(company);
        return result;
    }

    // --- Private helpers ---

    private void validatePlanDowngrade(Organization org, SubscriptionPlan newPlan) {
        Optional<Company> headOffice = companyRepository
                .findByOrganizationIdAndCompanyType(org.getId(), Company.CompanyType.HEAD_OFFICE);

        long currentBranches = headOffice
                .map(ho -> companyRepository.countByParentCompanyIdAndIsActiveTrue(ho.getId()))
                .orElse(0L);

        if (currentBranches > newPlan.getMaxBranches()) {
            throw new BadRequestException(
                    "Cannot downgrade to " + newPlan.name() + ": organization has " + currentBranches
                    + " active branches but plan allows only " + newPlan.getMaxBranches());
        }

        List<Company> companies = companyRepository.findByOrganizationId(org.getId());
        long currentEmployees = companies.stream()
                .mapToLong(c -> employeeRepository.findByCompanyIdAndIsActiveTrue(c.getId()).size())
                .sum();

        if (newPlan.getMaxEmployees() != Integer.MAX_VALUE && currentEmployees > newPlan.getMaxEmployees()) {
            throw new BadRequestException(
                    "Cannot downgrade to " + newPlan.name() + ": organization has " + currentEmployees
                    + " employees but plan allows only " + newPlan.getMaxEmployees());
        }
    }
}
