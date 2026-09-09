package com.example.demo.carr.repository;
import com.example.demo.carr.entity.CarrAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CarrAuditEventRepository extends JpaRepository<CarrAuditEvent,Long> {
    List<CarrAuditEvent> findByCarrIdOrderByCreatedAtDesc(Long carrId);
}
