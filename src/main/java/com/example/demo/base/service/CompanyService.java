package com.example.demo.base.service;

import com.example.demo.auth.dto.AssignRoleRequest;
import com.example.demo.auth.dto.RegisterRequest;
import com.example.demo.auth.entity.Role;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.entity.UserRole;
import com.example.demo.auth.service.AuthService;
import com.example.demo.auth.service.UserRoleService;
import com.example.demo.base.dto.CompanyRequest;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.base.repository.OrganizationRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.tenant.SchemaProvisioningService;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Handles all company creation and management with business rule enforcement.
 *
 * Key rules enforced here:
 *   1. Only a HEAD_OFFICE company can create branches.
 *   2. A branch cannot create another branch.
 *   3. Maximum branches per Head Office = branchLimit (default 5).
 *   4. A branch is always linked to its parent Head Office and same organization.
 */
@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final OrganizationRepository organizationRepository;
    private final SchemaProvisioningService schemaProvisioningService;
    private final AuthService authService;
    private final UserRoleService userRoleService;
    private final EmployeeRepository employeeRepository;

    /**
     * Creates a new Head Office company for an organization.
     * Only Prabha Tech (Platform Super Admin) can call this.
     */
    @Transactional
    public Company createHeadOffice(CompanyRequest request) {
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

        // Provision tenant schema for the new Head Office
        String schemaName = SchemaProvisioningService.toSchemaName(org.getName());
        headOffice.setSchemaName(schemaName);
        headOffice = companyRepository.save(headOffice);
        // Provision asynchronously — returns immediately so the HTTP response is fast.
        // Tables are created in the background; they're ready well before any user data is entered.
        schemaProvisioningService.provisionSchemaAsync(schemaName);

        // Create the enterprise admin user and assign ENTERPRISE_ADMIN + ENTERPRISE scope
        if (request.getAdminUsername() != null && !request.getAdminUsername().isBlank()
                && request.getAdminPassword() != null && !request.getAdminPassword().isBlank()) {
            RegisterRequest reg = new RegisterRequest();
            reg.setUsername(request.getAdminUsername());
            reg.setEmail(request.getAdminEmail() != null && !request.getAdminEmail().isBlank()
                    ? request.getAdminEmail() : request.getAdminUsername());
            reg.setPassword(request.getAdminPassword());
            User adminUser = authService.register(reg);

            AssignRoleRequest roleReq = new AssignRoleRequest();
            roleReq.setUserId(adminUser.getId());
            roleReq.setRoleName(Role.RoleName.ENTERPRISE_ADMIN);
            roleReq.setCompanyId(headOffice.getId());
            roleReq.setAccessScope(UserRole.AccessScope.ENTERPRISE);
            userRoleService.assignRole(roleReq);

            // Create an Employee profile so the admin gets an employeeId
            Employee adminEmployee = new Employee();
            String firstName = (request.getAdminFirstName() != null && !request.getAdminFirstName().isBlank())
                    ? request.getAdminFirstName() : request.getAdminUsername();
            adminEmployee.setFirstName(firstName);
            adminEmployee.setLastName(request.getAdminLastName());
            adminEmployee.setWorkEmail(request.getAdminUsername());
            adminEmployee.setCompany(headOffice);
            adminEmployee.setUser(adminUser);
            adminEmployee.setDateJoining(LocalDate.now());
            employeeRepository.save(adminEmployee);
        }

        return headOffice;
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
        branch.setOrganization(headOffice.getOrganization()); // Branch inherits HO's organization

        return companyRepository.save(branch);
    }

    /**
     * Updates basic company details.
     * Does not allow changing company type or organization after creation.
     * Branch Admins can only update their own branch — not the Head Office or other branches.
     */
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
        company.setCountry(request.getCountry());
        company.setZip(request.getZip());
        company.setPhone(request.getPhone());
        company.setEmail(request.getEmail());
        company.setWebsite(request.getWebsite());
        company.setTaxId(request.getTaxId());
        company.setRegistrationNumber(request.getRegistrationNumber());

        return companyRepository.save(company);
    }

    /**
     * Soft-deactivates a company.
     * Note: deactivating a Head Office will make all its branches inaccessible.
     */
    @Transactional
    public void deactivate(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        company.setStatus(Company.CompanyStatus.INACTIVE);
        company.setActive(false);
        companyRepository.save(company);
    }

    /**
     * Gets all branches under a Head Office.
     */
    public List<Company> getBranches(Long headOfficeId) {
        Company headOffice = companyRepository.findById(headOfficeId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", headOfficeId));
        if (!headOffice.isHeadOffice()) {
            throw new BadRequestException("Company '" + headOffice.getName() + "' is not a Head Office");
        }
        return companyRepository.findByParentCompanyId(headOfficeId);
    }

    /**
     * Gets all Head Offices (one per organization).
     */
    public List<Company> getAllHeadOffices() {
        return companyRepository.findByCompanyType(Company.CompanyType.HEAD_OFFICE);
    }

    // --- Private helpers ---

    private Company buildCompany(CompanyRequest request) {
        Company company = new Company();
        company.setName(request.getName());
        company.setAddress(request.getAddress());
        company.setCity(request.getCity());
        company.setState(request.getState());
        company.setCountry(request.getCountry());
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
