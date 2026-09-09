package com.example.demo.carr.repository;
import com.example.demo.carr.entity.CarrKpi;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CarrKpiRepository extends JpaRepository<CarrKpi,Long> {
    List<CarrKpi> findByCarrIdOrderById(Long carrId);
}
