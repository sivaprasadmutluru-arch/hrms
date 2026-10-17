package com.example.demo.auth.security;

import com.example.demo.auth.entity.Permission;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.repository.PermissionRepository;
import com.example.demo.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        // An active Platform Super Admin role gets every permission in the system
        // so that all hasAuthority() checks pass without requiring explicit
        // role-permission mapping. Do not rely on the legacy is_superuser flag.
        if (UserPrincipal.hasEffectivePlatformSuperAdminRole(user)) {
            List<Permission> allPermissions = permissionRepository.findAll();
            return new UserPrincipal(user, allPermissions);
        }

        return new UserPrincipal(user);
    }
}
