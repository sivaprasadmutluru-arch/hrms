package com.example.demo.audit;

import com.example.demo.audit.entity.AuditTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditTagRepository extends JpaRepository<AuditTag, Long> {
    List<AuditTag> findByCompanyId(Long companyId);
}
