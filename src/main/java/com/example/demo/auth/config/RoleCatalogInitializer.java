package com.example.demo.auth.config;

import com.example.demo.auth.entity.Role;
import com.example.demo.auth.repository.PermissionRepository;
import com.example.demo.auth.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;

/**
 * Keeps production role definitions in sync without enabling development seed
 * data.  Role assignments remain untouched; only the catalog definition is
 * created or updated.
 */
@Component
@Order(2)
@RequiredArgsConstructor
public class RoleCatalogInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Override
    @Transactional
    public void run(String... args) {
        Role ceo = roleRepository.findByName(Role.RoleName.CEO).orElseGet(() -> {
            Role role = new Role();
            role.setName(Role.RoleName.CEO);
            return role;
        });
        ceo.setDisplayName("Chief Executive Officer");
        ceo.setDescription("Executive company-wide access to the assigned Head Office and all of its branches");
        ceo.setPermissions(new HashSet<>(permissionRepository.findAll()));
        roleRepository.save(ceo);
    }
}
