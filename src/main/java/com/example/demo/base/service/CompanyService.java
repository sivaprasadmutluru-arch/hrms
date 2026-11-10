package com.example.demo.base.service;

import com.example.demo.auth.dto.AssignRoleRequest;
import com.example.demo.auth.dto.RegisterRequest;
import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.repository.CrossBranchAccessGrantRepository;
import com.example.demo.auth.repository.UserGroupRepository;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.auth.service.AuthService;
import com.example.demo.auth.service.UserRoleService;
import com.example.demo.audit.AuditService;
import com.example.demo.base.dto.CompanyRequest;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.OrganizationRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.service.FileUploadService;
import com.example.demo.common.tenant.SchemaProvisioningService;
import com.example.demo.common.tenant.TenantContext;
import com.example.demo.common.tenant.TenantProvisioningService;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Handles all company creation and management with business rule enforcement.
 *
 * Key rules enforced here:
 *   1. Only a HEAD_OFFICE company can create branches.
 *   2. A branch cannot create another branch.
 *   3. Maximum branches per Head Office = branchLimit (default 5).
 *   4. A branch is always linked to its parent Head Office and same organization.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyService {

    private static final String INITIAL_ENTERPRISE_ADMIN_REASON =
            "Initial enterprise administrator provisioned during organization creation";

    // Self-reference is retained for the small public-data phases below.  Tenant DDL
    // is never invoked from this service or its HTTP request.
    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private CompanyService self;

    private final CompanyRepository companyRepository;
    private final AuditService auditService;
    private final com.example.demo.billing.BillingUsage billingUsage;

    @Transactional(readOnly = true)
    public Company getById(Long id) {
        return companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
    }
    private final OrganizationRepository organizationRepository;
    private final SchemaProvisioningService schemaProvisioningService;
    private final TenantProvisioningService tenantProvisioningService;
    private final StandardCompanySetup standardCompanySetup;
    private final AuthService authService;
    private final UserRoleService userRoleService;
    private final EmployeeRepository employeeRepository;
    private final FileUploadService fileUploadService;
    private final UserRoleRepository userRoleRepository;
    private final UserGroupRepository userGroupRepository;
    private final CrossBranchAccessGrantRepository crossBranchAccessGrantRepository;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Creates all short-lived public records atomically, then leaves the long-running
     * tenant DDL to the durable provisioning worker.  A failed validation, identity or
     * role assignment rolls this transaction back; it cannot leave a visible account
     * with only some of its public records written.
     */
    @Transactional
    public Company createHeadOffice(CompanyRequest request) {
        Company headOffice = self.createHeadOfficeRecord(request);
        Long initialAdminUserId = self.createInitialAdminAccess(headOffice.getId(), request);
        // Account creation is intentionally quick. DDL never runs in this HTTP
        // request; the committed job owns the complete tenant setup lifecycle.
        tenantProvisioningService.enqueue(headOffice.getId(), initialAdminUserId);
        return headOffice;
    }

    @Transactional
    public Company createHeadOfficeRecord(CompanyRequest request) {
        if (request.getOrganizationId() == null) {
            throw new BadRequestException("Organization ID is required when creating a Head Office");
        }

        Organization org = organizationRepository.findById(request.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization", request.getOrganizationId()));

        // Each organization can only have one Head Office
        companyRepository.findByOrganizationIdAndCompanyType(org.getId(), Company.CompanyType.HEAD_OFFICE)
                .ifPresent(existing -> {
                    throw new BadRequestException(
                            "Organization '" + org.getName() + "' already has a Head Office: " + existing.getName());
                });

        Company headOffice = buildCompany(request);
        headOffice.setCompanyType(Company.CompanyType.HEAD_OFFICE);
        headOffice.setOrganization(org);
        headOffice.setBranchLimit(request.getBranchLimit() != null ? request.getBranchLimit() : 5);

        headOffice = companyRepository.save(headOffice);

        String schemaName = SchemaProvisioningService.toSchemaName(org.getName());
        headOffice.setSchemaName(schemaName);
        headOffice.setSchemaReady(false);
        return companyRepository.save(headOffice);
    }

    @Transactional
    public Long createInitialAdminAccess(Long companyId, CompanyRequest request) {
        Company headOffice = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));

        // Public identity and role assignment do not depend on tenant DDL. The
        // tenant employee profile is created by TenantProvisioningService only
        // after the workspace passes provisioning validation.
        if (request.getAdminUsername() != null && !request.getAdminUsername().isBlank()
                && request.getAdminPassword() != null && !request.getAdminPassword().isBlank()) {
            RegisterRequest reg = new RegisterRequest();
            reg.setUsername(request.getAdminUsername());
            reg.setEmail(request.getAdminEmail() != null && !request.getAdminEmail().isBlank()
                    ? request.getAdminEmail() : request.getAdminUsername());
            reg.setPassword(request.getAdminPassword());
            reg.setFirstName(request.getAdminFirstName());
            reg.setLastName(request.getAdminLastName());
            User adminUser = authService.register(reg);

            AssignRoleRequest roleReq = new AssignRoleRequest();
            roleReq.setUserId(adminUser.getId());
            roleReq.setRoleName(Role.RoleName.ENTERPRISE_ADMIN);
            roleReq.setCompanyId(headOffice.getId());
            roleReq.setAccessScope(UserRole.AccessScope.ENTERPRISE);
            // Role changes require an audit reason. This is a system-generated
            // first-admin assignment, so it gets a durable, explicit reason
            // rather than bypassing the validation used for manual grants.
            roleReq.setReason(INITIAL_ENTERPRISE_ADMIN_REASON);
            userRoleService.assignInitialOrganizationAdmin(roleReq);
            return adminUser.getId();
        }
        return null;
    }

    /**
     * Creates a new Branch under an existing Head Office.
     *
     * Rules enforced:
     *   - The parent must be a HEAD_OFFICE (branches cannot create branches)
     *   - The Head Office must not have reached its branch limit
     */
    @Transactional
    public Company createBranch(Long headOfficeId, CompanyRequest request) {
        Company headOffice = companyRepository.findById(headOfficeId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", headOfficeId));

        // Rule 1: Parent must be a Head Office
        if (!headOffice.isHeadOffice()) {
            throw new BadRequestException(
                    "'" + headOffice.getName() + "' is a Branch. Only a Head Office can create branches.");
        }

        // Rule 2: Head Office must be active
        if (headOffice.getStatus() != Company.CompanyStatus.ACTIVE) {
            throw new BadRequestException(
                    "Head Office '" + headOffice.getName() + "' is not active. Cannot create branches.");
        }

        // Serialize capacity checks with employee creation and paid plan changes.
        if (headOffice.getOrganization()!=null) {
            entityManager.refresh(headOffice.getOrganization(),jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            entityManager.refresh(headOffice);
        } else {
            entityManager.refresh(headOffice,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        }

        // Rule 3: Check branch limit (both company-level and subscription plan-level)
        long currentBranchCount = companyRepository.countByParentCompanyIdAndIsActiveTrue(headOfficeId);
        int branchLimit = headOffice.getBranchLimit() != null ? headOffice.getBranchLimit() : 5;
        if (currentBranchCount >= branchLimit) {
            throw new BadRequestException(
                    "Branch limit of " + branchLimit + " reached for '" + headOffice.getName() +
                    "'. Current branches: " + currentBranchCount);
        }

        // Rule 4: Check subscription plan limit
        Organization org = headOffice.getOrganization();
        if (org != null && org.getSubscriptionPlan() != null) {
            int planMaxBranches = org.getSubscriptionPlan().getMaxBranches();
            if (planMaxBranches != Integer.MAX_VALUE && currentBranchCount >= planMaxBranches) {
                throw new BadRequestException(
                        "Subscription plan '" + org.getSubscriptionPlan().name() +
                        "' allows a maximum of " + planMaxBranches + " branches. Upgrade your plan to add more.");
            }
        }

        Company branch = buildCompany(request);
        branch.setCompanyType(Company.CompanyType.BRANCH);
        branch.setParentCompany(headOffice);
        branch.setCurrency(headOffice.getCurrency());
        branch.setOrganization(headOffice.getOrganization()); // Branch inherits HO's organization

        branch = companyRepository.saveAndFlush(branch);
        if(headOffice.isSchemaReady()) standardCompanySetup.ensure(branch.getId());
        return branch;
    }

    /**
     * Updates basic company details.
     * Does not allow changing company type or organization after creation.
     * Branch Admins can only update their own branch — not the Head Office or other branches.
     */
    private static void requirePlatformCountryEditor() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_PLATFORM_SUPER_ADMIN")))
            throw new org.springframework.security.access.AccessDeniedException("Only a platform administrator can change country");
    }

    private static String validCountry(String country) {
        if (country == null || country.isBlank() || country.trim().length() > 100)
            throw new BadRequestException("Select a country (up to 100 characters)");
        String selected = country.trim();
        if (!java.util.Set.of("IN","US","AE","GB").contains(com.example.demo.accounting.AccountingCountryProfile.from(selected).code()))
            throw new BadRequestException("Choose a launch country: India, United States, United Arab Emirates or United Kingdom");
        return selected;
    }

    @Transactional
    public Company updateCountry(Long id, String country) {
        requirePlatformCountryEditor();
        Company company = companyRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Company", id));
        if (!company.isHeadOffice()) throw new BadRequestException("Set organization country on its head office");
        String before = company.getCountry();
        company.setCountry(validCountry(country));
        auditService.log("Company", id, "COUNTRY_CHANGED", java.util.Collections.singletonMap("country", before), java.util.Map.of("country", company.getCountry()));
        return companyRepository.save(company);
    }

    @Transactional
    public Company update(Long id, CompanyRequest request) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));

        // Enforce: BRANCH scope users can only update their own branch
        AccessScopeContext.ScopeData callerScope = AccessScopeContext.get();
        if (callerScope != null && !callerScope.hasUnrestrictedAccess()
                && callerScope.getScope() == UserRole.AccessScope.BRANCH) {
            if (!callerScope.getAccessibleCompanyIds().contains(id)) {
                throw new BadRequestException(
                        "Branch Admin can only update their own branch. " +
                        "Company ID " + id + " is not accessible to you.");
            }
        }

        company.setName(request.getName());
        company.setAddress(request.getAddress());
        company.setCity(request.getCity());
        company.setState(request.getState());
        if (request.getCountry() != null && !java.util.Objects.equals(company.getCountry(), request.getCountry().trim())) {
            requirePlatformCountryEditor();
            String before = company.getCountry();
            company.setCountry(validCountry(request.getCountry()));
            auditService.log("Company", id, "COUNTRY_CHANGED", java.util.Collections.singletonMap("country", before), java.util.Map.of("country", company.getCountry()));
        }
        company.setZip(request.getZip());
        company.setPhone(request.getPhone());
        company.setEmail(request.getEmail());
        company.setWebsite(request.getWebsite());
        company.setTaxId(request.getTaxId());
        company.setRegistrationNumber(request.getRegistrationNumber());

        return companyRepository.save(company);
    }

    /**
     * Updates only the currency for a company/branch.
     */
    @Transactional
    public Company updateCurrency(Long id, String currency) {
        if (currency == null || currency.isBlank()) {
            throw new BadRequestException("Currency code is required");
        }
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        company.setCurrency(currency.toUpperCase().trim());
        return companyRepository.save(company);
    }

    /**
     * Archives a company rather than destroying it.  The old implementation deleted
     * tenant data, public records and role assignments before deleting the company
     * row.  That made a successful response irreversible and made recovery depend on
     * an external database restore.  Archiving keeps every record and only removes the
     * company from operational lists and sign-in access.
     */
    @Transactional
    public void delete(Long id) {
        archive(id, null);
    }

    @Transactional
    public void archive(Long id, String reason) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        List<Company> affected = new ArrayList<>();
        if (company.isHeadOffice()) affected.addAll(companyRepository.findByParentCompanyId(id));
        affected.add(company);
        CurrentCompanyDeletionGuard.check(affected.stream().map(Company::getId).toList());

        LocalDateTime archivedAt = LocalDateTime.now();
        String actor = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication() != null
                ? org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName()
                : "system";
        for (Company target : affected) {
            target.setActive(false);
            target.setStatus(Company.CompanyStatus.INACTIVE);
            target.setArchivedAt(archivedAt);
            target.setArchivedBy(actor);
            target.setArchiveReason(reason);
        }
        companyRepository.saveAll(affected);
        auditService.log("COMPANY", id, "ARCHIVED", company.getName(),
                java.util.Map.of("reason", reason == null ? "" : reason, "affectedCompanyIds",
                        affected.stream().map(Company::getId).toList()));
    }

    @Transactional
    public void restore(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        Company headOffice=company;
        if (company.isBranch()) {
            Long parentId=company.getParentCompanyId()!=null ? company.getParentCompanyId()
                    : company.getParentCompany()!=null ? company.getParentCompany().getId() : null;
            if (parentId==null) throw new BadRequestException("A branch must have a Head Office before it can be restored");
            headOffice=companyRepository.findById(parentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Head Office", parentId));
            if (!headOffice.isHeadOffice()) throw new BadRequestException("A branch must belong to a Head Office");
        }
        Organization org=headOffice.getOrganization();
        // Match the organization lock used by creation and plan activation. Count
        // the complete proposed restoration before changing any active flags.
        if (org!=null) {
            entityManager.refresh(org,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            entityManager.refresh(headOffice);
            if (company!=headOffice) entityManager.refresh(company);
            if (org.getStatus()!=Organization.OrgStatus.ACTIVE)
                throw new BadRequestException("Activate the organization before restoring its companies");
        } else {
            entityManager.refresh(headOffice,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            if (company!=headOffice) entityManager.refresh(company);
        }
        if (company.isBranch() && (!headOffice.isActive() || headOffice.getStatus()!=Company.CompanyStatus.ACTIVE))
            throw new BadRequestException("Restore the Head Office before restoring this branch");
        List<Company> affected = new ArrayList<>();
        if (company.isHeadOffice()) affected.addAll(companyRepository.findByParentCompanyId(id));
        affected.add(company);
        long addedBranches=affected.stream().filter(Company::isBranch).filter(c -> !c.isActive()).count();
        long projectedBranches=companyRepository.countByParentCompanyIdAndIsActiveTrue(headOffice.getId())+addedBranches;
        int branchLimit=headOffice.getBranchLimit()!=null ? headOffice.getBranchLimit() : 5;
        var plan=org!=null && org.getSubscriptionPlan()!=null ? org.getSubscriptionPlan()
                : com.example.demo.base.enums.SubscriptionPlan.STANDARD;
        if (org!=null) branchLimit=Math.min(branchLimit,plan.getMaxBranches());
        if (projectedBranches>branchLimit)
            throw new BadRequestException("Restoring these companies would exceed the branch limit of "+branchLimit+". Upgrade the plan or reduce active branches first.");
        if (org!=null) billingUsage.validateRestoration(org.getId(),plan,
                affected.stream().map(Company::getId).toList(),org.getPurchasedSeats());
        for (Company target : affected) {
            target.setActive(true);
            target.setStatus(Company.CompanyStatus.ACTIVE);
            target.setArchivedAt(null);
            target.setArchivedBy(null);
            target.setArchiveReason(null);
        }
        companyRepository.saveAll(affected);
        auditService.log("COMPANY", id, "RESTORED", null,
                java.util.Map.of("restoredCompanyIds", affected.stream().map(Company::getId).toList()));
    }

    /**
     * Irreversible live-data purge. This is intentionally separate from archive and
     * may only be exposed to a Platform Super Admin. Database backups and host audit
     * logs are retained under their own retention policy; they are not silently
     * destroyed by an application request.
     */
    @Transactional
    public void purgePermanently(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        String companyName = company.getName();
        List<Company> toPurge = new ArrayList<>();
        if (company.isHeadOffice()) toPurge.addAll(companyRepository.findByParentCompanyId(id));
        toPurge.add(company);
        List<Long> companyIds = toPurge.stream().map(Company::getId).collect(Collectors.toList());
        CurrentCompanyDeletionGuard.check(companyIds);

        String schemaName = company.isHeadOffice() ? company.getSchemaName()
                : (company.getParentCompanyId() == null ? null
                : companyRepository.findById(company.getParentCompanyId()).map(Company::getSchemaName).orElse(null));
        if (schemaName != null && !schemaName.isBlank()) {
            schemaProvisioningService.cleanupTenantDataForCompanies(schemaName, companyIds);
        }
        // Run independent JDBC cleanup before this transaction locks role rows.
        // It detaches platform-wide grants before removing company-owned records.
        schemaProvisioningService.cleanupPublicSchemaDataForCompanies(companyIds);
        crossBranchAccessGrantRepository.deleteAllInBatch(
                crossBranchAccessGrantRepository.findByCompanyIds(companyIds));
        var groups = userGroupRepository.findByCompanyIdIn(companyIds);
        groups.forEach(group -> group.setCompany(null));
        userGroupRepository.saveAll(groups);
        userRoleRepository.deleteAllInBatch(userRoleRepository.findByCompanyIdIn(companyIds));
        companyRepository.deleteAllInBatch(toPurge.stream().filter(Company::isBranch).toList());
        companyRepository.deleteById(id);
        entityManager.clear();
        auditService.log("COMPANY", id, "PURGED", companyName,
                java.util.Map.of("purgedCompanyIds", companyIds));
    }

    /**
     * Gets all branches under a Head Office.
     */
    public List<Company> getBranches(Long headOfficeId) {
        Company company = companyRepository.findByIdPublic(headOfficeId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", headOfficeId));
        // If a branch ID was passed, resolve up to its parent head office transparently
        Company headOffice = company.isBranch() && company.getParentCompany() != null
                ? companyRepository.findByIdPublic(company.getParentCompany().getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Company", company.getParentCompany().getId()))
                : company;
        if (!headOffice.isHeadOffice()) {
            throw new BadRequestException("Company '" + headOffice.getName() + "' is not a Head Office");
        }
        return companyRepository.findByParentCompanyIdAndIsActiveTruePublic(headOffice.getId());
    }

    /**
     * Gets all Head Offices (one per organization).
     * Uses a native query with explicit public. schema to bypass tenant search_path.
     */
    public List<Company> getAllHeadOffices() {
        return companyRepository.findAllHeadOfficesActivePublic();
    }

    /**
     * Uploads and stores the logo for a company (Head Office or Branch).
     * Files are stored under: media/{orgSlug}/logos/
     */
    @Transactional
    public Company uploadLogo(Long companyId, MultipartFile file) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        Organization org = company.getOrganization();
        String orgSlug = (org != null && org.getSlug() != null) ? org.getSlug() : "default";
        if (company.getLogoPath() != null) fileUploadService.delete(company.getLogoPath());
        String path = fileUploadService.storeOrgScoped(file, orgSlug, "logos");
        company.setLogoPath(path);
        if (org != null && (company.getCompanyType() == Company.CompanyType.HEAD_OFFICE || org.getLogoPath() == null || org.getLogoPath().isBlank())) {
            org.setLogoPath(path);
            organizationRepository.save(org);
        }
        return companyRepository.save(company);
    }

    @Transactional
    public Company uploadStamp(Long companyId, MultipartFile file) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        Organization org = company.getOrganization();
        String orgSlug = (org != null && org.getSlug() != null) ? org.getSlug() : "default";
        if (company.getStampPath() != null) fileUploadService.delete(company.getStampPath());
        String path = fileUploadService.storeOrgScoped(file, orgSlug, "stamps");
        company.setStampPath(path);
        return companyRepository.save(company);
    }

    @Transactional
    public void deleteStamp(Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        if (company.getStampPath() != null) {
            fileUploadService.delete(company.getStampPath());
            company.setStampPath(null);
            companyRepository.save(company);
        }
    }

    @Transactional
    public Company uploadSignature(Long companyId, MultipartFile file) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        Organization org = company.getOrganization();
        String orgSlug = (org != null && org.getSlug() != null) ? org.getSlug() : "default";
        if (company.getSignaturePath() != null) fileUploadService.delete(company.getSignaturePath());
        String path = fileUploadService.storeOrgScoped(file, orgSlug, "signatures");
        company.setSignaturePath(path);
        return companyRepository.save(company);
    }

    @Transactional
    public void deleteSignature(Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        if (company.getSignaturePath() != null) {
            fileUploadService.delete(company.getSignaturePath());
            company.setSignaturePath(null);
            companyRepository.save(company);
        }
    }

    // --- Private helpers ---

    private Company buildCompany(CompanyRequest request) {
        Company company = new Company();
        company.setName(request.getName());
        company.setAddress(request.getAddress());
        company.setCity(request.getCity());
        company.setState(request.getState());
        company.setCountry(request.getCountry());
        var profile = com.example.demo.accounting.AccountingCountryProfile.from(request.getCountry());
        company.setCurrency(switch(profile.code()){case "IN" -> "INR";case "AE" -> "AED";case "GB" -> "GBP";default -> "USD";});
        company.setZip(request.getZip());
        company.setPhone(request.getPhone());
        company.setEmail(request.getEmail());
        company.setWebsite(request.getWebsite());
        company.setTaxId(request.getTaxId());
        company.setRegistrationNumber(request.getRegistrationNumber());
        company.setStatus(Company.CompanyStatus.ACTIVE);
        return company;
    }
}
