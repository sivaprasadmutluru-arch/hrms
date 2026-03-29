package com.example.demo.ldap.repository;

import com.example.demo.ldap.entity.LdapSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LdapSettingsRepository extends JpaRepository<LdapSettings, Long> {
    Optional<LdapSettings> findFirstByOrderByIdAsc();
}
