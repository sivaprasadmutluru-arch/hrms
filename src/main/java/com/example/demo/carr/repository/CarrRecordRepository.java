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
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CarrRecord c where c.id=?1 and c.company.id=?2 and c.taskRecord=false")
    Optional<CarrRecord> findForUpdate(Long id,Long companyId);
    @EntityGraph(attributePaths={"employee","employee.department","manager","template","cycle"})
    @Query("select c from CarrRecord c where c.company.id=?1 and c.taskRecord=false order by c.updatedAt desc")
    List<CarrRecord> findByCompanyIdOrderByUpdatedAtDesc(Long companyId);
    @EntityGraph(attributePaths={"employee","employee.department","manager","template","cycle"})
    @Query("select c from CarrRecord c where c.company.id=?1 and c.employee.id=?2 and c.taskRecord=false order by c.updatedAt desc")
    List<CarrRecord> findByCompanyIdAndEmployeeIdOrderByUpdatedAtDesc(Long companyId, Long employeeId);
    @EntityGraph(attributePaths={"employee","employee.department","manager","template","cycle"})
    @Query("select c from CarrRecord c where c.company.id=?1 and c.manager.id=?2 and c.taskRecord=false order by c.updatedAt desc")
    List<CarrRecord> findByCompanyIdAndManagerIdOrderByUpdatedAtDesc(Long companyId, Long managerId);
    @EntityGraph(attributePaths={"employee","employee.department","manager","template","cycle"})
    @Query("select c from CarrRecord c where c.id=?1 and c.company.id=?2 and c.taskRecord=false")
    Optional<CarrRecord> findByIdAndCompanyId(Long id, Long companyId);
    @Query("select count(c) from CarrRecord c where c.company.id=?1 and c.status=?2 and c.taskRecord=false")
    long countByCompanyIdAndStatus(Long companyId, CarrStatus status);
    @Query("select count(distinct c.employee.id) from CarrRecord c where c.company.id=:companyId and c.status=:status and c.taskRecord=false")
    long countDistinctEmployeesByCompanyAndStatus(@Param("companyId") Long companyId, @Param("status") CarrStatus status);
    @Query("select count(c) from CarrRecord c where c.company.id=?1 and c.nextReviewDate<?2 and c.status=?3 and c.taskRecord=false")
    long countByCompanyIdAndNextReviewDateBeforeAndStatus(Long companyId, LocalDate date, CarrStatus status);
    @Query("select (count(c)>0) from CarrRecord c where c.company.id=?1 and c.employee.id=?2 and c.cycle.id=?3 and c.status<>?4 and c.taskRecord=false")
    boolean existsByCompanyIdAndEmployeeIdAndCycleIdAndStatusNot(Long companyId, Long employeeId, Long cycleId, CarrStatus status);
}
