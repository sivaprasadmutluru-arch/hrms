package com.example.demo.base.service;

import com.example.demo.auth.entity.UserGroup;
import com.example.demo.auth.repository.CrossBranchAccessGrantRepository;
import com.example.demo.auth.repository.UserGroupRepository;
import com.example.demo.auth.repository.UserRoleRepository;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import com.example.demo.base.enums.SubscriptionPlan;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.OrganizationRepository;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.service.FileUploadService;
import com.example.demo.employee.repository.EmployeeRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
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
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final FileUploadService fileUploadService;
    private final UserRoleRepository userRoleRepository;
    private final UserGroupRepository userGroupRepository;
    private final CrossBranchAccessGrantRepository crossBranchAccessGrantRepository;

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
    public Organization createOrganization(Organization organization) {
        // Auto-generate slug from name if not provided
        if (organization.getSlug() == null || organization.getSlug().isBlank()) {
            organization.setSlug(organization.getName().toLowerCase()
                    .replaceAll("[^a-z0-9]+", "-")
                    .replaceAll("^-|-$", ""));
        }
        // Ensure slug uniqueness
        String baseSlug = organization.getSlug();
        String slug = baseSlug;
        int i = 1;
        while (organizationRepository.findBySlug(slug).isPresent()) {
            slug = baseSlug + "-" + i++;
        }
        organization.setSlug(slug);
        if (organization.getStatus() == null) {
            organization.setStatus(Organization.OrgStatus.ACTIVE);
        }
        if (organization.getSubscriptionPlan() == null) {
            organization.setSubscriptionPlan(SubscriptionPlan.STANDARD);
        }
        return organizationRepository.save(organization);
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

    @Transactional
    public void deleteOrganization(Long id) {
        Organization org = getOrganizationById(id);
        List<Company> companies = companyRepository.findByOrganizationId(id);

        if (!companies.isEmpty()) {
            List<Long> companyIds = companies.stream().map(Company::getId).collect(Collectors.toList());

            // Delete public-schema records that reference these companies
            crossBranchAccessGrantRepository.deleteAllInBatch(
                    crossBranchAccessGrantRepository.findByCompanyIds(companyIds));

            var groups = userGroupRepository.findByCompanyIdIn(companyIds);
            groups.forEach(g -> g.setCompany(null));
            userGroupRepository.saveAll(groups);

            userRoleRepository.deleteAllInBatch(
                    userRoleRepository.findByCompanyIdIn(companyIds));

            // Delete employees for each company (use deleteAllInBatch so the DELETE
            // is flushed to the DB immediately, before the company rows are deleted below)
            companies.forEach(c -> employeeRepository.deleteAllInBatch(
                    employeeRepository.findByCompanyId(c.getId())));

            // Delete branches first (FK to head office), then head offices.
            // Use deleteAllInBatch to bypass JPA cascade and issue a direct DELETE.
            List<Company> branches = companies.stream().filter(Company::isBranch).collect(Collectors.toList());
            List<Company> headOffices = companies.stream().filter(Company::isHeadOffice).collect(Collectors.toList());
            companyRepository.deleteAllInBatch(branches);
            companyRepository.deleteAllInBatch(headOffices);

            // Evict all stale managed entities (Company objects deleted above are still in
            // session). Without this, Hibernate sees them at flush time referencing a
            // now-removed Organization and throws TransientObjectException.
            entityManager.clear();
        }

        if (org.getLogoPath() != null) {
            fileUploadService.delete(org.getLogoPath());
        }
        // Re-fetch org because entityManager.clear() detached it
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
