package com.example.demo.base.repository;

import com.example.demo.base.entity.CompanyAccessControl;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CompanyAccessControlRepository extends JpaRepository<CompanyAccessControl, Long> {
    Optional<CompanyAccessControl> findByUserId(Long userId);
}
