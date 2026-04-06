package com.example.demo.ldap.service;

import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.ldap.entity.LdapSettings;
import com.example.demo.ldap.repository.LdapSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LdapService {

    private final LdapSettingsRepository ldapSettingsRepository;

    @Transactional(readOnly = true)
    public LdapSettings getSettings() {
        return ldapSettingsRepository.findFirstByOrderByIdAsc().orElse(new LdapSettings());
    }

    public LdapSettings createOrUpdateSettings(LdapSettings request) {
        LdapSettings settings = ldapSettingsRepository.findFirstByOrderByIdAsc().orElse(new LdapSettings());
        settings.setLdapServer(request.getLdapServer());
        settings.setBindDn(request.getBindDn());
        if (request.getBindPassword() != null) {
            settings.setBindPassword(request.getBindPassword());
        }
        settings.setBaseDn(request.getBaseDn());
        return ldapSettingsRepository.save(settings);
    }

    public void deleteSettings(Long id) {
        if (!ldapSettingsRepository.existsById(id)) {
            throw new ResourceNotFoundException("LdapSettings", id);
        }
        ldapSettingsRepository.deleteById(id);
    }
}
