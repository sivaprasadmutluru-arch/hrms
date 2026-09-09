package com.example.demo.carr.repository;
import com.example.demo.carr.entity.CarrResponsibility;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CarrResponsibilityRepository extends JpaRepository<CarrResponsibility,Long> {
    List<CarrResponsibility> findByCarrIdOrderById(Long carrId);
    long countByCarrCompanyIdAndAccountableEmployeeIsNull(Long companyId);
}
