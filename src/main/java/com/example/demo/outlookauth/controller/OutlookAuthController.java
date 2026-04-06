package com.example.demo.outlookauth.controller;

import com.example.demo.outlookauth.entity.AzureApi;
import com.example.demo.outlookauth.service.OutlookAuthService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/outlook-auth")
@RequiredArgsConstructor
@Tag(name = "Outlook Auth")
public class OutlookAuthController {

    private final OutlookAuthService outlookAuthService;

    @GetMapping("/configs")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    public ResponseEntity<List<AzureApi>> listConfigs() {
        return ResponseEntity.ok(outlookAuthService.listConfigs());
    }

    @GetMapping("/configs/company/{companyId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    public ResponseEntity<List<AzureApi>> listConfigsByCompany(@PathVariable Long companyId) {
        return ResponseEntity.ok(outlookAuthService.listConfigsByCompany(companyId));
    }

    @PostMapping("/configs")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    public ResponseEntity<AzureApi> createConfig(@RequestBody AzureApi config) {
        return ResponseEntity.ok(outlookAuthService.createConfig(config));
    }

    @PutMapping("/configs/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    public ResponseEntity<AzureApi> updateConfig(@PathVariable Long id, @RequestBody AzureApi updated) {
        return ResponseEntity.ok(outlookAuthService.updateConfig(id, updated));
    }

    @DeleteMapping("/configs/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    public ResponseEntity<Map<String, String>> deleteConfig(@PathVariable Long id) {
        outlookAuthService.deleteConfig(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @PostMapping("/configs/{id}/set-primary")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    public ResponseEntity<AzureApi> setPrimary(@PathVariable Long id) {
        return ResponseEntity.ok(outlookAuthService.setPrimary(id));
    }
}
