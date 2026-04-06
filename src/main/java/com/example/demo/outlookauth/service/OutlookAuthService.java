package com.example.demo.outlookauth.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.outlookauth.entity.AzureApi;
import com.example.demo.outlookauth.repository.AzureApiRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OutlookAuthService {

    private final AzureApiRepository azureApiRepository;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public List<AzureApi> listConfigs() {
        return azureApiRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<AzureApi> listConfigsByCompany(Long companyId) {
        return azureApiRepository.findByCompanyId(companyId);
    }

    public AzureApi createConfig(AzureApi config) {
        if (config.getCompany() != null && config.getCompany().getId() != null) {
            config.setCompany(companyRepository.getReferenceById(config.getCompany().getId()));
        }
        if (azureApiRepository.count() == 0) {
            config.setPrimary(true);
        }
        return azureApiRepository.save(config);
    }

    public AzureApi updateConfig(Long id, AzureApi updated) {
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
        return azureApiRepository.save(existing);
    }

    public void deleteConfig(Long id) {
        azureApiRepository.deleteById(id);
    }

    public AzureApi setPrimary(Long id) {
        AzureApi target = azureApiRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AzureApi", id));
        List<AzureApi> allConfigs = azureApiRepository.findAll();
        for (AzureApi config : allConfigs) {
            if (config.isPrimary()) {
                config.setPrimary(false);
                azureApiRepository.save(config);
            }
        }
        target.setPrimary(true);
        return azureApiRepository.save(target);
    }
}
