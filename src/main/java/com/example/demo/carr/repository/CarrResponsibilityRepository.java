package com.example.demo.carr.repository;
import com.example.demo.carr.entity.CarrResponsibility;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CarrResponsibilityRepository extends JpaRepository<CarrResponsibility,Long> {
    List<CarrResponsibility> findByCarrIdOrderById(Long carrId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths={"carr", "carr.company", "carr.manager", "accountableEmployee", "accountableEmployee.department", "accountableEmployee.user"})
    List<CarrResponsibility> findByCarrCompanyIdAndIsActiveTrueOrderByUpdatedAtDesc(Long companyId);
    long countByCarrCompanyIdAndAccountableEmployeeIsNull(Long companyId);
    List<CarrResponsibility> findByDueDateLessThanEqualAndIsActiveTrue(java.time.LocalDate date);
}
