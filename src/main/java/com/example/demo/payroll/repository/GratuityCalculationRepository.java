package com.example.demo.payroll.repository;

import com.example.demo.payroll.entity.GratuityCalculation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GratuityCalculationRepository extends JpaRepository<GratuityCalculation, Long>,
        JpaSpecificationExecutor<GratuityCalculation> {

    List<GratuityCalculation> findByCompanyId(Long companyId);

    List<GratuityCalculation> findByCompanyIdIn(List<Long> companyIds);

    List<GratuityCalculation> findByEmployeeId(Long employeeId);

    @Query("SELECT g FROM GratuityCalculation g " +
           "LEFT JOIN FETCH g.employee " +
           "LEFT JOIN FETCH g.company " +
           "LEFT JOIN FETCH g.approvedBy " +
           "WHERE g.id = :id")
    Optional<GratuityCalculation> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT g FROM GratuityCalculation g " +
           "LEFT JOIN FETCH g.employee " +
           "LEFT JOIN FETCH g.company " +
           "LEFT JOIN FETCH g.approvedBy " +
           "WHERE g.company.id IN :companyIds " +
           "ORDER BY g.createdAt DESC")
    List<GratuityCalculation> findAllByCompanyIdInWithDetails(@Param("companyIds") List<Long> companyIds);

    @Query("SELECT g FROM GratuityCalculation g " +
           "LEFT JOIN FETCH g.employee " +
           "LEFT JOIN FETCH g.company " +
           "LEFT JOIN FETCH g.approvedBy " +
           "ORDER BY g.createdAt DESC")
    List<GratuityCalculation> findAllWithDetails();
}
