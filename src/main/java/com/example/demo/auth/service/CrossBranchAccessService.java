package com.example.demo.auth.service;

import com.example.demo.auth.entity.CrossBranchAccessGrant;
import com.example.demo.auth.repository.CrossBranchAccessGrantRepository;
import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CrossBranchAccessService {

    private final CrossBranchAccessGrantRepository grantRepository;
    private final CompanyRepository companyRepository;

    /**
     * Grant a user access to another company's (branch) data.
     * Only callable by Head Office admins (enforced at controller level).
     */
    @Transactional
    public CrossBranchAccessGrant grantAccess(Long userId, Long targetCompanyId, Long grantedByCompanyId, String reason) {
        Company target = companyRepository.findById(targetCompanyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", targetCompanyId));
        Company grantedBy = companyRepository.findById(grantedByCompanyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company", grantedByCompanyId));

        if (!grantedBy.isHeadOffice()) {
            throw new IllegalArgumentException("Only Head Office companies can grant cross-branch access");
        }

        // Check subscription plan allows cross-branch access
        Organization org = grantedBy.getOrganization();
        if (org != null && org.getSubscriptionPlan() != null
                && !org.getSubscriptionPlan().isCrossBranchAccessAllowed()) {
            throw new BadRequestException(
                    "Your subscription plan '" + org.getSubscriptionPlan().name() +
                    "' does not allow cross-branch access. Upgrade to STANDARD or ENTERPRISE.");
        }

        // Check if grant already exists; if so, just activate it
        if (grantRepository.existsByUserIdAndTargetCompanyId(userId, targetCompanyId)) {
            List<CrossBranchAccessGrant> existing = grantRepository.findByUserId(userId);
            CrossBranchAccessGrant grant = existing.stream()
                    .filter(g -> g.getTargetCompany().getId().equals(targetCompanyId))
                    .findFirst()
                    .orElseThrow();
            grant.setActive(true);
            grant.setReason(reason);
            return grantRepository.save(grant);
        }

        CrossBranchAccessGrant grant = new CrossBranchAccessGrant();
        grant.setUserId(userId);
        grant.setTargetCompany(target);
        grant.setGrantedByCompany(grantedBy);
        grant.setReason(reason);
        return grantRepository.save(grant);
    }

    /**
     * Revoke a previously granted cross-branch access.
     */
    @Transactional
    public void revokeAccess(Long userId, Long targetCompanyId) {
        List<CrossBranchAccessGrant> grants = grantRepository.findByUserId(userId);
        grants.stream()
                .filter(g -> g.getTargetCompany().getId().equals(targetCompanyId))
                .forEach(g -> {
                    g.setActive(false);
                    grantRepository.save(g);
                });
    }

    /**
     * Get all companies this user has been granted access to (in addition to their own).
     */
    public List<Long> getGrantedCompanyIds(Long userId) {
        return grantRepository.findGrantedCompanyIdsByUserId(userId);
    }

    /**
     * List all grants for a user.
     */
    public List<CrossBranchAccessGrant> getUserGrants(Long userId) {
        return grantRepository.findByUserId(userId);
    }
}
