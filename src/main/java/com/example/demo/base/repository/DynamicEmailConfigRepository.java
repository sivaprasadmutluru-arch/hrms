package com.example.demo.base.repository;

import com.example.demo.base.entity.DynamicEmailConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DynamicEmailConfigRepository extends JpaRepository<DynamicEmailConfig, Long>, JpaSpecificationExecutor<DynamicEmailConfig> {
    Optional<DynamicEmailConfig> findFirstByCompanyId(Long companyId);
    List<DynamicEmailConfig> findAllByCompanyId(Long companyId);
}
