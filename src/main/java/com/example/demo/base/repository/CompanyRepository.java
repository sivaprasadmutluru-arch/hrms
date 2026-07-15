package com.example.demo.base.repository;

import com.example.demo.base.entity.Company;
import com.example.demo.base.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long>, JpaSpecificationExecutor<Company> {

    Optional<Company> findByName(String name);

    // Get all active companies
    List<Company> findByIsActiveTrue();

    // Get all Head Offices (top-level companies with no parent)
    List<Company> findByParentCompanyIsNull();

    // Get all branches under a specific Head Office
    List<Company> findByParentCompanyId(Long parentId);

    // Get active branches under a specific Head Office
    List<Company> findByParentCompanyIdAndIsActiveTrue(Long parentId);

    // Get only active branches under a Head Office (used for branch limit check)
    long countByParentCompanyIdAndIsActiveTrue(Long parentId);

    // Get all companies by type (HEAD_OFFICE or BRANCH)
    List<Company> findByCompanyType(Company.CompanyType companyType);

    // Get active companies by type
    List<Company> findByCompanyTypeAndIsActiveTrue(Company.CompanyType companyType);

    // Get all companies belonging to a specific organization
    List<Company> findByOrganizationId(Long organizationId);

    // Get the Head Office of an organization (there should be only one)
    Optional<Company> findByOrganizationIdAndCompanyType(Long organizationId, Company.CompanyType type);

    // ── Native queries that bypass tenant search_path ────────────────────────
    // These use an explicit public. schema prefix so they always query the public
    // schema regardless of the current TenantContext (important for platform-admin
    // endpoints that must see ALL companies, not just one tenant's view).

    @Query(value = "SELECT * FROM public.companies WHERE is_active = true", nativeQuery = true)
    List<Company> findAllActivePublic();

    @Query(value = "SELECT * FROM public.companies WHERE is_active = true AND company_type = 'HEAD_OFFICE'", nativeQuery = true)
    List<Company> findAllHeadOfficesActivePublic();

    @Query(value = "SELECT * FROM public.companies WHERE is_active = true AND organization_id = :orgId", nativeQuery = true)
    List<Company> findAllActiveByOrganizationIdPublic(@Param("orgId") Long orgId);

    @Query(value = "SELECT * FROM public.companies", nativeQuery = true)
    List<Company> findAllPublic();

    // Get all branch IDs under a Head Office — used to build accessible company list for HO users
    @Query("SELECT c.id FROM Company c WHERE c.parentCompany.id = :headOfficeId AND c.isActive = true")
    List<Long> findBranchIdsByHeadOfficeId(Long headOfficeId);

    // Get organization status for a given company — used to enforce suspension checks
    @Query("SELECT c.organization.status FROM Company c WHERE c.id = :companyId")
    Optional<Organization.OrgStatus> findOrgStatusByCompanyId(@Param("companyId") Long companyId);

    // Get organization slug for a given company — avoids lazy-loading Company.organization
    // outside a transaction (spring.jpa.open-in-view=false means the session closes as
    // soon as a plain findById() call returns).
    @Query("SELECT c.organization.slug FROM Company c WHERE c.id = :companyId")
    Optional<String> findOrganizationSlugByCompanyId(@Param("companyId") Long companyId);

    // Find companies that have no organization linked (directly created in DB)
    @Query(value = "SELECT * FROM public.companies WHERE organization_id IS NULL", nativeQuery = true)
    List<Company> findAllOrphanCompaniesPublic();

    // Public-schema lookups used when a tenant search_path is already active
    // (e.g. Super Admin viewing a company via X-Company-Id header)
    @Query(value = "SELECT * FROM public.companies WHERE id = :id", nativeQuery = true)
    Optional<Company> findByIdPublic(@Param("id") Long id);

    @Query(value = "SELECT * FROM public.companies WHERE parent_company_id = :parentId AND is_active = true", nativeQuery = true)
    List<Company> findByParentCompanyIdAndIsActiveTruePublic(@Param("parentId") Long parentId);
}
