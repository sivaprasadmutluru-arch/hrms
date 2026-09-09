package com.example.demo.carr.repository;
import com.example.demo.carr.entity.CarrRoleTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface CarrRoleTemplateRepository extends JpaRepository<CarrRoleTemplate,Long> {
    List<CarrRoleTemplate> findByCompanyIdAndIsActiveTrueOrderByTitle(Long companyId);
    Optional<CarrRoleTemplate> findByIdAndCompanyId(Long id, Long companyId);
}
