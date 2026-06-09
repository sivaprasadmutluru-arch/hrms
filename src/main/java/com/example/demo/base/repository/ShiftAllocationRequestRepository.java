package com.example.demo.base.repository;

import com.example.demo.base.entity.ShiftAllocationRequest;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShiftAllocationRequestRepository extends JpaRepository<ShiftAllocationRequest, Long>, JpaSpecificationExecutor<ShiftAllocationRequest> {

    @EntityGraph("ShiftAllocationRequest.withAssociations")
    @Query("SELECT a FROM ShiftAllocationRequest a WHERE a.company.id IN :companyIds")
    List<ShiftAllocationRequest> findByCompanyIdIn(List<Long> companyIds);

    @EntityGraph("ShiftAllocationRequest.withAssociations")
    @Query("SELECT a FROM ShiftAllocationRequest a WHERE a.company.id IN :companyIds AND a.status = :status")
    List<ShiftAllocationRequest> findByCompanyIdInAndStatus(List<Long> companyIds, ShiftAllocationRequest.AllocationStatus status);

    @EntityGraph("ShiftAllocationRequest.withAssociations")
    @Query("SELECT a FROM ShiftAllocationRequest a WHERE a.company.id = :companyId")
    List<ShiftAllocationRequest> findByCompanyId(Long companyId);

    @EntityGraph("ShiftAllocationRequest.withAssociations")
    @Query("SELECT a FROM ShiftAllocationRequest a WHERE a.employee.id = :employeeId")
    List<ShiftAllocationRequest> findByEmployeeId(Long employeeId);

    @EntityGraph("ShiftAllocationRequest.withAssociations")
    @Query("SELECT a FROM ShiftAllocationRequest a WHERE a.company.id = :companyId AND a.status = :status")
    List<ShiftAllocationRequest> findByCompanyIdAndStatus(Long companyId, ShiftAllocationRequest.AllocationStatus status);

    @EntityGraph("ShiftAllocationRequest.withAssociations")
    List<ShiftAllocationRequest> findAll();
}
