package com.example.demo.base.repository;

import com.example.demo.base.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long>, JpaSpecificationExecutor<Company> {

    Optional<Company> findByName(String name);

    // Get all Head Offices (top-level companies with no parent)
    List<Company> findByParentCompanyIsNull();

    // Get all branches under a specific Head Office
    List<Company> findByParentCompanyId(Long parentId);

    // Get only active branches under a Head Office (used for branch limit check)
    long countByParentCompanyIdAndIsActiveTrue(Long parentId);

    // Get all companies by type (HEAD_OFFICE or BRANCH)
    List<Company> findByCompanyType(Company.CompanyType companyType);

    // Get all companies belonging to a specific organization
    List<Company> findByOrganizationId(Long organizationId);

    // Get the Head Office of an organization (there should be only one)
    Optional<Company> findByOrganizationIdAndCompanyType(Long organizationId, Company.CompanyType type);

    // Get all branch IDs under a Head Office — used to build accessible company list for HO users
    @Query("SELECT c.id FROM Company c WHERE c.parentCompany.id = :headOfficeId AND c.isActive = true")
    List<Long> findBranchIdsByHeadOfficeId(Long headOfficeId);
}
