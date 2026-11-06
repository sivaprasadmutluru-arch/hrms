package com.example.demo.billing;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface BillingEventRepository extends JpaRepository<BillingEvent,String> {
    List<BillingEvent> findTop20ByOrganizationIdAndTypeOrderByProcessedAtDesc(Long organizationId,String type);
    boolean existsByOrganizationIdAndType(Long organizationId,String type);
}
