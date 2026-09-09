package com.example.demo.carr.repository;
import com.example.demo.carr.entity.CarrRecord;
import com.example.demo.carr.entity.CarrStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.*;
public interface CarrRecordRepository extends JpaRepository<CarrRecord,Long> {
    @EntityGraph(attributePaths={"employee","employee.department","manager","template","cycle"})
    List<CarrRecord> findByCompanyIdOrderByUpdatedAtDesc(Long companyId);
    @EntityGraph(attributePaths={"employee","employee.department","manager","template","cycle"})
    List<CarrRecord> findByCompanyIdAndEmployeeIdOrderByUpdatedAtDesc(Long companyId, Long employeeId);
    @EntityGraph(attributePaths={"employee","employee.department","manager","template","cycle"})
    List<CarrRecord> findByCompanyIdAndManagerIdOrderByUpdatedAtDesc(Long companyId, Long managerId);
    @EntityGraph(attributePaths={"employee","employee.department","manager","template","cycle"})
    Optional<CarrRecord> findByIdAndCompanyId(Long id, Long companyId);
    long countByCompanyIdAndStatus(Long companyId, CarrStatus status);
    @Query("select count(distinct c.employee.id) from CarrRecord c where c.company.id=:companyId and c.status=:status")
    long countDistinctEmployeesByCompanyAndStatus(@Param("companyId") Long companyId, @Param("status") CarrStatus status);
    long countByCompanyIdAndNextReviewDateBeforeAndStatus(Long companyId, LocalDate date, CarrStatus status);
    boolean existsByCompanyIdAndEmployeeIdAndCycleIdAndStatusNot(Long companyId, Long employeeId, Long cycleId, CarrStatus status);
}
