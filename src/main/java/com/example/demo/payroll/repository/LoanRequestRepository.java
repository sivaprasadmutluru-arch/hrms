package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.LoanRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanRequestRepository extends JpaRepository<LoanRequest, Long> {

    List<LoanRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    List<LoanRequest> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    boolean existsByEmployeeIdAndStatus(Long employeeId, LoanRequest.RequestStatus status);

    @Query("SELECT r FROM LoanRequest r WHERE r.company.id = :companyId AND r.status = 'PENDING' " +
           "ORDER BY r.createdAt ASC")
    List<LoanRequest> findPendingApproval(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(r) FROM LoanRequest r WHERE r.company.id = :companyId AND r.status = 'PENDING'")
    long countPendingApproval(@Param("companyId") Long companyId);
}
