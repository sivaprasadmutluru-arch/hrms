package com.example.demo.hrpolicy.service;

import com.example.demo.base.entity.Company;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.context.AccessScopeContext;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.hrpolicy.entity.HrPolicy;
import com.example.demo.hrpolicy.repository.HrPolicyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HrPolicyService {

    private final HrPolicyRepository hrPolicyRepository;
    private final CompanyRepository companyRepository;

    /**
     * Returns policies visible to the current user:
     * - Policies belonging to their accessible companies
     * - OR organization-wide policies (created by Head Office)
     */
    public List<HrPolicy> getVisiblePolicies() {
        Specification<HrPolicy> scopeSpec = ScopeFilter.byCompany();
        Specification<HrPolicy> orgWideSpec = (root, query, cb) -> cb.isTrue(root.get("isOrganizationWide"));

        if (scopeSpec == null) {
            // Platform admin — see everything
            return hrPolicyRepository.findAll();
        }

        // Combine: policies in accessible companies OR organization-wide ones
        Specification<HrPolicy> combined = Specification.where(scopeSpec).or(orgWideSpec);
        return hrPolicyRepository.findAll(combined);
    }

    public HrPolicy create(HrPolicy policy, Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        policy.setCompany(company);
        // Only Head Office companies can create org-wide policies
        if (Boolean.TRUE.equals(policy.getIsOrganizationWide()) && !company.isHeadOffice()) {
            policy.setIsOrganizationWide(false);
        }
        return hrPolicyRepository.save(policy);
    }

    public HrPolicy update(Long id, HrPolicy updated) {
        HrPolicy policy = hrPolicyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("HrPolicy", id));
        policy.setTitle(updated.getTitle());
        policy.setContent(updated.getContent());
        policy.setCategory(updated.getCategory());
        // Allow toggling org-wide only if company is Head Office
        if (policy.getCompany().isHeadOffice()) {
            policy.setIsOrganizationWide(updated.getIsOrganizationWide());
        }
        return hrPolicyRepository.save(policy);
    }

    public void delete(Long id) {
        HrPolicy policy = hrPolicyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("HrPolicy", id));
        policy.setActive(false);
        hrPolicyRepository.save(policy);
    }

    public HrPolicy publish(Long id) {
        HrPolicy policy = hrPolicyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("HrPolicy", id));
        policy.setIsPublished(true);
        return hrPolicyRepository.save(policy);
    }

    public HrPolicy unpublish(Long id) {
        HrPolicy policy = hrPolicyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("HrPolicy", id));
        policy.setIsPublished(false);
        return hrPolicyRepository.save(policy);
    }

    /**
     * Makes a policy organization-wide. Only Head Office companies may do this.
     */
    public HrPolicy makeOrganizationWide(Long policyId, Long requestingCompanyId) {
        HrPolicy policy = hrPolicyRepository.findById(policyId)
                .orElseThrow(() -> new ResourceNotFoundException("HrPolicy", policyId));
        Company company = companyRepository.findById(requestingCompanyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", requestingCompanyId));

        if (!company.isHeadOffice()) {
            throw new BadRequestException("Only Head Office companies can make policies organization-wide");
        }
        // Policy must belong to this Head Office
        if (!policy.getCompany().getId().equals(requestingCompanyId)) {
            throw new BadRequestException("Policy does not belong to this company");
        }

        policy.setIsOrganizationWide(true);
        return hrPolicyRepository.save(policy);
    }

    /**
     * Restricts a policy to the branch that owns it (removes org-wide flag).
     */
    public HrPolicy makeBranchOnly(Long policyId, Long requestingCompanyId) {
        HrPolicy policy = hrPolicyRepository.findById(policyId)
                .orElseThrow(() -> new ResourceNotFoundException("HrPolicy", policyId));

        if (!policy.getCompany().getId().equals(requestingCompanyId)) {
            throw new BadRequestException("Policy does not belong to this company");
        }

        policy.setIsOrganizationWide(false);
        return hrPolicyRepository.save(policy);
    }

    /**
     * Returns all organization-wide policies visible to the current user's scope.
     */
    public List<HrPolicy> getInheritedPolicies() {
        Specification<HrPolicy> orgWideSpec = (root, query, cb) -> cb.isTrue(root.get("isOrganizationWide"));
        Specification<HrPolicy> scopeSpec = ScopeFilter.byCompany();

        if (scopeSpec == null) {
            // Platform admin — return all org-wide policies
            return hrPolicyRepository.findByIsOrganizationWideTrue();
        }

        // Return only org-wide policies in the user's accessible scope
        return hrPolicyRepository.findAll(Specification.where(orgWideSpec));
    }
}
