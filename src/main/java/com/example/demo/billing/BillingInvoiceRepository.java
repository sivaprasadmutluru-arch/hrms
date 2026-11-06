package com.example.demo.billing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
public interface BillingInvoiceRepository extends JpaRepository<BillingInvoice,String> {
    boolean existsByOrganizationId(Long organizationId);
    Page<BillingInvoice> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId, Pageable pageable);
}
