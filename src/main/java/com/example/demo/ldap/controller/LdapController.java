package com.example.demo.ldap.controller;

import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.ldap.entity.LdapSettings;
import com.example.demo.ldap.repository.LdapSettingsRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ldap")
@RequiredArgsConstructor
@Tag(name = "LDAP")
@PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
public class LdapController {

    private final LdapSettingsRepository ldapSettingsRepository;

    @GetMapping("/settings")
    @Transactional(readOnly = true)
    public ResponseEntity<LdapSettings> getSettings() {
        LdapSettings settings = ldapSettingsRepository.findFirstByOrderByIdAsc()
                .orElse(new LdapSettings());
        return ResponseEntity.ok(settings);
    }

    @PostMapping("/settings")
    @Transactional
    public ResponseEntity<LdapSettings> createOrUpdateSettings(@RequestBody LdapSettings request) {
        LdapSettings settings = ldapSettingsRepository.findFirstByOrderByIdAsc().orElse(new LdapSettings());
        settings.setLdapServer(request.getLdapServer());
        settings.setBindDn(request.getBindDn());
        if (request.getBindPassword() != null) {
            settings.setBindPassword(request.getBindPassword());
        }
        settings.setBaseDn(request.getBaseDn());
        return ResponseEntity.ok(ldapSettingsRepository.save(settings));
    }

    @DeleteMapping("/settings/{id}")
    public ResponseEntity<Map<String, String>> deleteSettings(@PathVariable Long id) {
        if (!ldapSettingsRepository.existsById(id)) {
            throw new ResourceNotFoundException("LdapSettings", id);
        }
        ldapSettingsRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }
}
