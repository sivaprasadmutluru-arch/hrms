package com.example.demo.ldap.controller;

import com.example.demo.ldap.entity.LdapSettings;
import com.example.demo.ldap.service.LdapService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ldap")
@RequiredArgsConstructor
@Tag(name = "LDAP")
@PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
public class LdapController {

    private final LdapService ldapService;

    @GetMapping("/settings")
    public ResponseEntity<LdapSettings> getSettings() {
        return ResponseEntity.ok(ldapService.getSettings());
    }

    @PostMapping("/settings")
    public ResponseEntity<LdapSettings> createOrUpdateSettings(@RequestBody LdapSettings request) {
        return ResponseEntity.ok(ldapService.createOrUpdateSettings(request));
    }

    @DeleteMapping("/settings/{id}")
    public ResponseEntity<Map<String, String>> deleteSettings(@PathVariable Long id) {
        ldapService.deleteSettings(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }
}
