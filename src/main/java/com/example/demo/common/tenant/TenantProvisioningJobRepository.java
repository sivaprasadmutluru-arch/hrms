package com.example.demo.common.tenant;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TenantProvisioningJobRepository extends JpaRepository<TenantProvisioningJob, Long> {

    Optional<TenantProvisioningJob> findByCompanyId(Long companyId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from TenantProvisioningJob j where j.company.id = :companyId")
    Optional<TenantProvisioningJob> findByCompanyIdForUpdate(@Param("companyId") Long companyId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from TenantProvisioningJob j where j.id = :id")
    Optional<TenantProvisioningJob> findByIdForUpdate(@Param("id") Long id);

    List<TenantProvisioningJob> findByStatusIn(List<TenantProvisioningJob.Status> statuses);
}
