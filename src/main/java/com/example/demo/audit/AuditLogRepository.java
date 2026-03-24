package com.example.demo.audit;

import com.example.demo.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {
    Page<AuditLog> findByEntityType(String entityType, Pageable pageable);
    Page<AuditLog> findByCompanyId(Long companyId, Pageable pageable);
    Page<AuditLog> findByEntityTypeAndCompanyId(String entityType, Long companyId, Pageable pageable);
}
