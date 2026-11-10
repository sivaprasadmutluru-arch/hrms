package com.example.demo.base.repository;

import com.example.demo.base.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long>, JpaSpecificationExecutor<Organization> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Organization o where o.id=:id")
    Optional<Organization> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);

    Optional<Organization> findBySlug(String slug);
    Optional<Organization> findByName(String name);
    List<Organization> findByStatus(Organization.OrgStatus status);

    @Query("SELECT o FROM Organization o WHERE o.id NOT IN " +
           "(SELECT c.organization.id FROM Company c WHERE c.companyType = 'HEAD_OFFICE' AND c.organization IS NOT NULL)")
    List<Organization> findWithoutHeadOffice();
}
