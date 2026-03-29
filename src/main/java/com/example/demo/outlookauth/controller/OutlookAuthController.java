package com.example.demo.outlookauth.controller;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.outlookauth.entity.AzureApi;
import com.example.demo.outlookauth.repository.AzureApiRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/outlook-auth")
@RequiredArgsConstructor
@Tag(name = "Outlook Auth")
public class OutlookAuthController {

    private final AzureApiRepository azureApiRepository;
    private final CompanyRepository companyRepository;

    // ---- List all Azure API configs ----

    @GetMapping("/configs")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AzureApi>> listConfigs() {
        return ResponseEntity.ok(azureApiRepository.findAll());
    }

    // ---- List configs for a specific company ----

    @GetMapping("/configs/company/{companyId}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AzureApi>> listConfigsByCompany(@PathVariable Long companyId) {
        return ResponseEntity.ok(azureApiRepository.findByCompanyId(companyId));
    }

    // ---- Create Azure API config ----

    @PostMapping("/configs")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    public ResponseEntity<AzureApi> createConfig(@RequestBody AzureApi config) {
        if (config.getCompany() != null && config.getCompany().getId() != null) {
            config.setCompany(companyRepository.getReferenceById(config.getCompany().getId()));
        }
        // If this is the first config overall, mark it as primary
        if (azureApiRepository.count() == 0) {
            config.setPrimary(true);
        }
        return ResponseEntity.ok(azureApiRepository.save(config));
    }

    // ---- Update Azure API config ----

    @PutMapping("/configs/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    public ResponseEntity<AzureApi> updateConfig(@PathVariable Long id, @RequestBody AzureApi updated) {
        AzureApi existing = azureApiRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AzureApi", id));
        existing.setOutlookClientId(updated.getOutlookClientId());
        existing.setOutlookClientSecret(updated.getOutlookClientSecret());
        existing.setOutlookTenantId(updated.getOutlookTenantId());
        existing.setOutlookEmail(updated.getOutlookEmail());
        existing.setOutlookDisplayName(updated.getOutlookDisplayName());
        existing.setOutlookRedirectUri(updated.getOutlookRedirectUri());
        existing.setOutlookAuthorizationUrl(updated.getOutlookAuthorizationUrl());
        existing.setOutlookTokenUrl(updated.getOutlookTokenUrl());
        existing.setOutlookApiEndpoint(updated.getOutlookApiEndpoint());
        existing.setToken(updated.getToken());
        existing.setOauthState(updated.getOauthState());
        existing.setLastRefreshed(updated.getLastRefreshed());
        if (updated.getCompany() != null && updated.getCompany().getId() != null) {
            existing.setCompany(companyRepository.getReferenceById(updated.getCompany().getId()));
        }
        return ResponseEntity.ok(azureApiRepository.save(existing));
    }

    // ---- Delete Azure API config ----

    @DeleteMapping("/configs/{id}")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, String>> deleteConfig(@PathVariable Long id) {
        azureApiRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ---- Set a config as primary (unset all others) ----

    @PostMapping("/configs/{id}/set-primary")
    @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN')")
    @Transactional
    public ResponseEntity<AzureApi> setPrimary(@PathVariable Long id) {
        AzureApi target = azureApiRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AzureApi", id));

        // Unset all existing primaries
        List<AzureApi> allConfigs = azureApiRepository.findAll();
        for (AzureApi config : allConfigs) {
            if (config.isPrimary()) {
                config.setPrimary(false);
                azureApiRepository.save(config);
            }
        }

        // Set the target as primary
        target.setPrimary(true);
        return ResponseEntity.ok(azureApiRepository.save(target));
    }
}
